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
   * @param params The event parameters including event name, data, and optional correlation ID
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
   * Listens for all occurrences of an event.
   * @param params The event parameters including event name and callback
   */
  onEvent(params: OnEventParams) {
    this.eventEmitter.on(params.event, (payload: EventPayload) => {
      params.callback(payload.data, payload.correlationId);
    });
  }

  /**
   * Listens for multiple events and buffers them until all events are received with matching correlation IDs.
   * @param params The dependent events parameters including array of events and callback
   */
  onDependentEvents(params: OnDependentEventsParams) {
    const callbackId = params.events.sort().join("-");
    this.callbacks.set(callbackId, params.callback);

    params.events.forEach((event) => {
      this.eventEmitter.on(event, (payload: EventPayload) => {
        if (!payload.correlationId) return;

        if (!this.eventBuffer.has(payload.correlationId)) {
          this.eventBuffer.set(payload.correlationId, new Map());
        }

        const buffer = this.eventBuffer.get(payload.correlationId)!;
        buffer.set(event, payload.data);

        if (params.events.every((e) => buffer.has(e))) {
          // Convert buffer Map to Record object
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
      });
    });
  }

  /**
   * Listens for a single occurrence of an event with a specific correlation ID.
   * The listener automatically detaches after receiving a matching event.
   * @param params The event parameters including event name, correlation ID, and callback
   */
  onceEvent(params: OnceEventParams) {
    const listener = (payload: EventPayload) => {
      if (payload.correlationId === params.correlationId) {
        params.callback(payload.data);
        this.eventEmitter.removeListener(params.event, listener);
      }
    };

    this.eventEmitter.on(params.event, listener);
  }

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
