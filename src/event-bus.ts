import { EventEmitter } from "events";

interface EventPayload {
  event: string;
  data: any;
  correlationId?: string;
}

interface EmitEventParams {
  event: string;
  data: any;
  correlationId?: string;
}

interface OnEventParams {
  event: string;
  callback: (data: any, correlationId?: string) => void;
}

interface OnDependentEventsParams {
  events: string[];
  callback: (buffer: Record<string, any>) => void;
}

interface OnceEventParams {
  event: string;
  correlationId: string;
  callback: (data: any) => void;
}

type BufferMap = Map<string, Map<string, any>>;
type CallbackMap = Map<string, (buffer: Record<string, any>) => void>;

export class EventBus {
  private static _instance: EventBus;
  private eventEmitter: EventEmitter;
  private eventBuffer: BufferMap;
  private callbacks: CallbackMap;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventBuffer = new Map();
    this.callbacks = new Map();
  }

  public static init(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  public static get instance(): EventBus {
    if (!EventBus._instance) {
      throw new Error("EventBus not initialized. Call EventBus.init() first.");
    }
    return EventBus._instance;
  }

  // Emit an event
  emitEvent(params: EmitEventParams): void {
    const payload: EventPayload = {
      event: params.event,
      data: params.data,
      correlationId: params.correlationId,
    };

    this.eventEmitter.emit(params.event, payload);
  }

  // Listen for a single event
  onEvent(params: OnEventParams) {
    this.eventEmitter.on(params.event, (payload: EventPayload) => {
      params.callback(payload.data, payload.correlationId);
    });
  }

  // Listen for dependent events
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

  // Listen for a single occurrence of an event with matching correlationId
  onceEvent(params: OnceEventParams) {
    const listener = (payload: EventPayload) => {
      if (payload.correlationId === params.correlationId) {
        params.callback(payload.data);
        this.eventEmitter.removeListener(params.event, listener);
      }
    };

    this.eventEmitter.on(params.event, listener);
  }
}
