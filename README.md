# safe-event

A TypeScript event generator library that creates strongly-typed event definitions with runtime validation.

## Features

- Generate TypeScript types from JSON schema definitions
- Runtime validation using [ajv](https://github.com/ajv-validator/ajv)
- Type-safe event payload access
- Domain-scoped event naming (e.g. "user:profile.updated")
- Support for dot notation in event names
- Support for multiple schema files

## Installation

```bash
npm install safe-event
```

## Quick Start

### 1. Configuration

After installation, a `safe-event.config.json` file is created in your project root:

```json
{
  "schemaDir": "./events/schema",
  "outputDir": "./events/generated"
}
```

### 2. Define Events

Create event schema files in your schema directory (e.g. `events/schema/user-events.json`). The schema format follows the [Ajv JSON Schema specification](https://ajv.js.org/json-schema.html):

```json
{
  "domain": "user",
  "events": {
    "role.assigned": {
      "schema": {
        "type": "object",
        "properties": {
          "userId": { "type": "string" },
          "role": {
            "type": "string",
            "enum": ["admin", "editor", "viewer"]
          },
          "assignedBy": { "type": "string" },
          "expiresAt": { "type": "number" }
        },
        "required": ["userId", "role", "assignedBy"],
        "additionalProperties": false
      }
    }
  }
}
```

### 3. Generate Types

```bash
npx safe-event
```

> **Note:** Run this command whenever you update your event schemas to regenerate the TypeScript types.

### 4. Use Generated Types

```typescript
import {
  userEvents,
  RoleAssignedEventData,
  RoleAssignedEventPayload,
} from "./events/generated/user-events";

// Create type-safe event with validation
const event = RoleAssignedEventData.from({
  userId: "123",
  role: "editor", // Type-safe: only "admin" | "editor" | "viewer" allowed
  assignedBy: "456",
  expiresAt: Date.now() + 86400000,
});

// Get event type string
const eventType = userEvents["role.assigned"]; // "user:role.assigned"

// Type casting example
function handleEvent(type: string, data: any) {
  if (type === userEvents["role.assigned"]) {
    // data is now typed as RoleAssignedEventPayload
    const payload = data as RoleAssignedEventPayload;
    console.log(`${payload.role} role assigned by ${payload.assignedBy}`);
  }
}
```

## EventBus

A lightweight event management system that supports both single event listening and buffered event handling with correlation IDs.

### Basic Usage

```typescript
import { EventBus } from "./EventBus";
import {
  userEvents,
  RoleAssignedEventData,
  RoleAssignedEventPayload,
} from "./events/generated/user-events";

// Initialize
const eventBus = EventBus.init();

// Listen to single events
eventBus.onEvent({
  event: userEvents["role.assigned"],
  callback: (data: RoleAssignedEventPayload, correlationId?: string) => {
    console.log("Role assigned:", data, "correlation:", correlationId);
  },
});

// Emit events - with or without correlation ID
eventBus.emitEvent({
  event: userEvents["role.assigned"],
  data: RoleAssignedEventData.from({
    userId: "123",
    role: "editor",
    assignedBy: "456",
  }),
});

// With correlation ID
eventBus.emitEvent({
  event: userEvents["role.assigned"],
  data: RoleAssignedEventData.from({
    userId: "123",
    role: "editor",
    assignedBy: "456",
  }),
  correlationId: "correlation-123",
});
```

### Buffered Events Example

```typescript
import {
  userEvents,
  ProfileCreatedEventData,
  ProfileCreatedEventPayload,
  RoleAssignedEventData,
  RoleAssignedEventPayload,
} from "./events/generated/user-events";

// Listen for multiple related events
eventBus.onDependentEvents({
  events: [userEvents["profile.created"], userEvents["role.assigned"]],
  callback: (
    buffer: [ProfileCreatedEventPayload, RoleAssignedEventPayload]
  ) => {
    const [profileEvent, roleEvent] = buffer;
    console.log("Profile created and role assigned:", profileEvent, roleEvent);
  },
});

// Events must have matching correlation IDs to be buffered together
eventBus.emitEvent({
  event: userEvents["profile.created"],
  data: ProfileCreatedEventData.from({
    /* ... */
  }),
  correlationId: "request-123",
});

eventBus.emitEvent({
  event: userEvents["role.assigned"],
  data: RoleAssignedEventData.from({
    /* ... */
  }),
  correlationId: "request-123",
});
```

## License

MIT
