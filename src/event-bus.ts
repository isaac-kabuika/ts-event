import { EventEmitter } from "events";

export class EventBus {
  private static _instance: EventEmitter;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static init(): EventEmitter {
    if (!EventBus._instance) {
      EventBus._instance = new EventEmitter();
    }
    return EventBus._instance;
  }

  public static get instance(): EventEmitter {
    if (!EventBus._instance) {
      throw new Error("EventBus not initialized. Call EventBus.init() first.");
    }
    return EventBus._instance;
  }
}
