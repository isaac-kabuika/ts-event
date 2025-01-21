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
  callback: (buffer: any[]) => void;
}

type BufferMap = Map<string, Map<string, any>>;

type CallbackMap = Map<string, (buffer: any[]) => void>;

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
          const dataBuffer = params.events.map((e) => buffer.get(e));
          this.callbacks.get(callbackId)!(dataBuffer);
          this.eventBuffer.delete(payload.correlationId);
        }
      });
    });
  }
}
