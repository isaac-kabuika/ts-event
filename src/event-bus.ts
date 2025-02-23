import { EventEmitter } from "events";
import crypto from "crypto";

/** Represents the internal structure of an event payload */
interface EventPayload {
  event: string;
  data: any;
  correlationId?: string;
}

/** Parameters for emitting an event */
interface EmitEventParams {
  /** The event name/type to emit */
  event: string;
  /** The data payload for the event */
  data: any;
  /** Optional correlation ID to link related events */
  correlationId?: string;
}

/** Parameters for listening to a single event */
interface OnEventParams {
  /** The event name/type to listen for */
  event: string;
  /** Optional correlation ID to filter events */
  correlationId?: string;
  /** Callback function that receives the event data and optional correlation ID */
  callback: (data: any, correlationId?: string) => void;
}

/** Parameters for listening to multiple dependent events */
interface OnDependentEventsParams {
  /** Array of event names/types to wait for */
  events: string[];
  /**
   * Callback function that receives a buffer containing all event data
   * The buffer is a map of event names to their respective data
   */
  callback: (buffer: Record<string, any>) => void;
}

/** Parameters for listening to a single occurrence of an event */
interface OnceEventParams {
  /** The event name/type to listen for */
  event: string;
  /** The correlation ID to match */
  correlationId: string;
  /** Callback function that receives the event data */
  callback: (data: any) => void;
}

interface EmitAwaitParams<TEmit = unknown, TListen = unknown> {
  /** Event to emit */
  emitEvent: {
    event: string;
    data: TEmit;
  };
  /** Event to wait for */
  listenEvent: {
    event: string;
  };
  /** Timeout in milliseconds (default: 30) */
  timeout?: number;
}

type BufferMap = Map<string, Map<string, any>>;
type CallbackMap = Map<string, (buffer: Record<string, any>) => void>;

/** Represents an active event listener subscription */
interface EventListenerSubscription {
  /**
   * Removes the event listener and cleans up any related resources
   * @example
   * const subscription = eventBus.onEvent(...);
   * // When done listening:
   * subscription.destroy();
   */
  destroy: () => void;
}

/**
 * A singleton event bus that enables type-safe event emission and handling across your application.
 * Supports correlation IDs, one-time events, and dependent event buffering.
 */
export class EventBus {
  private static _instance: EventBus;
  private eventEmitter: EventEmitter;
  private eventBuffer: BufferMap;
  private callbacks: CallbackMap;
  private defaultEmitAwaitTimeoutMs: number = 1000 * 30;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventBuffer = new Map();
    this.callbacks = new Map();
  }

  /**
   * Initializes the EventBus singleton instance.
   * Must be called before using the EventBus.
   * @returns The EventBus instance
   */
  public static init(config?: { defaultTimeout?: number }): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
      EventBus._instance.defaultEmitAwaitTimeoutMs =
        config?.defaultTimeout ?? EventBus._instance.defaultEmitAwaitTimeoutMs;
    }
    return EventBus._instance;
  }

  /**
   * Gets the EventBus singleton instance.
   * @throws Error if EventBus has not been initialized
   */
  public static get instance(): EventBus {
    if (!EventBus._instance) {
      throw new Error("EventBus not initialized. Call EventBus.init() first.");
    }
    return EventBus._instance;
  }

  /**
   * Emits an event with optional correlation ID.
   * @param params - Configuration for event emission
   * @param params.event - The event type/name to emit
   * @param params.data - Payload data to send with the event
   * @param params.correlationId - Optional identifier for tracking related events
   * @example
   * eventBus.emitEvent({
   *   event: 'message.created',
   *   data: { text: 'Hello' },
   *   correlationId: '123'
   * });
   */
  emitEvent(params: EmitEventParams): void {
    const payload: EventPayload = {
      event: params.event,
      data: params.data,
      correlationId: params.correlationId,
    };

    this.eventEmitter.emit(params.event, payload);
  }

  /**
   * Listens for all occurrences of an event with optional correlation ID filtering
   * @param params - Listener configuration
   * @param params.event - Event type/name to listen for
   * @param params.correlationId - Optional filter to only receive events with matching correlation ID
   * @param params.callback - Function to execute when event is received
   * @returns Object with destroy() method to remove this listener
   * @example
   * const subscription = eventBus.onEvent({
   *   event: 'message.created',
   *   callback: (data) => console.log(data)
   * });
   *
   * // Later...
   * subscription.destroy();
   */
  onEvent(params: OnEventParams): EventListenerSubscription {
    const listener = (payload: EventPayload) => {
      // Skip if correlation ID doesn't match
      if (
        params.correlationId &&
        payload.correlationId !== params.correlationId
      ) {
        return;
      }
      params.callback(payload.data, payload.correlationId);
    };

    this.eventEmitter.on(params.event, listener);

    return {
      destroy: () => {
        this.eventEmitter.removeListener(params.event, listener);
      },
    };
  }

  /**
   * Listens for multiple events and buffers them until all are received with matching correlation IDs
   * @param params - Configuration for dependent events
   * @param params.events - Array of event types/names to wait for
   * @param params.callback - Function called when all events are received, receives combined data
   * @returns Object with destroy() method to remove all listeners
   * @example
   * eventBus.onDependentEvents({
   *   events: ['user.created', 'profile.updated'],
   *   callback: (combinedData) => {
   *     console.log('All user data:', combinedData);
   *   }
   * });
   */
  onDependentEvents(
    params: OnDependentEventsParams
  ): EventListenerSubscription {
    const callbackId = params.events.sort().join("-");
    this.callbacks.set(callbackId, params.callback);
    const listeners: Array<{
      event: string;
      listener: (payload: EventPayload) => void;
    }> = [];

    params.events.forEach((event) => {
      const listener = (payload: EventPayload) => {
        if (!payload.correlationId) return;

        if (!this.eventBuffer.has(payload.correlationId)) {
          this.eventBuffer.set(payload.correlationId, new Map());
        }

        const buffer = this.eventBuffer.get(payload.correlationId)!;
        buffer.set(event, payload.data);

        if (params.events.every((e) => buffer.has(e))) {
          const bufferObj = Array.from(buffer.entries()).reduce(
            (obj, [event, data]) => ({
              ...obj,
              [event]: data,
            }),
            {} as Record<string, any>
          );

          this.callbacks.get(callbackId)!(bufferObj);
          this.eventBuffer.delete(payload.correlationId);
        }
      };

      this.eventEmitter.on(event, listener);
      listeners.push({ event, listener });
    });

    return {
      destroy: () => {
        listeners.forEach(({ event, listener }) => {
          this.eventEmitter.removeListener(event, listener);
        });
        this.callbacks.delete(callbackId);
      },
    };
  }

  /**
   * Listens for a single occurrence of an event with specific correlation ID
   * @param params - Listener configuration
   * @param params.event - Event type/name to listen for
   * @param params.correlationId - Required correlation ID to match
   * @param params.callback - Function to execute when matching event is received
   * @returns Object with destroy() method to manually remove the listener
   * @example
   * eventBus.onceEvent({
   *   event: 'payment.completed',
   *   correlationId: 'txn_123',
   *   callback: (data) => updateOrderStatus(data)
   * });
   */
  onceEvent(params: OnceEventParams): EventListenerSubscription {
    const listener = (payload: EventPayload) => {
      if (payload.correlationId === params.correlationId) {
        params.callback(payload.data);
        this.eventEmitter.removeListener(params.event, listener);
      }
    };

    this.eventEmitter.on(params.event, listener);

    return {
      destroy: () => {
        this.eventEmitter.removeListener(params.event, listener);
      },
    };
  }

  /**
   * Emits an event and waits for a response event with matching correlation ID
   * @template TEmit - Type of data being emitted
   * @template TListen - Type of data expected in response
   * @param params - Configuration for emit/await operation
   * @param params.emitEvent - Event to emit (contains event name and data)
   * @param params.listenEvent - Event to wait for (contains event name)
   * @param params.timeout - Maximum wait time in milliseconds (default: 30000)
   * @returns Promise that resolves with response data or rejects on timeout
   * @example
   * const response = await eventBus.emitAwait({
   *   emitEvent: {
   *     event: 'request.data',
   *     data: { userId: 123 }
   *   },
   *   listenEvent: {
   *     event: 'response.data'
   *   },
   *   timeout: 5000
   * });
   */
  public async emitAwait<TEmit = unknown, TListen = unknown>(
    params: EmitAwaitParams<TEmit, TListen>
  ): Promise<TListen> {
    const correlationId = crypto.randomUUID();
    const timeout = params.timeout ?? this.defaultEmitAwaitTimeoutMs;

    return new Promise((resolve, reject) => {
      // Setup timeout rejection
      const timeoutId = setTimeout(() => {
        reject(new Error(`emitAwait timed out after ${timeout}ms`));
      }, timeout);

      // Setup once listener with TListen type
      this.onceEvent({
        event: params.listenEvent.event,
        correlationId,
        callback: (data: TListen) => {
          clearTimeout(timeoutId);
          resolve(data);
        },
      });

      // Emit the event with TEmit type data
      this.emitEvent({
        event: params.emitEvent.event,
        data: params.emitEvent.data,
        correlationId,
      });
    });
  }
}
