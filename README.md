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

A simple way to emit and listen to events across your application.

### Basic Example

```typescript
import { EventBus } from "./EventBus";
import {
  UserEvents,
  RoleAssignedEventData,
} from "./events/generated/user-events";

// Initialize
const eventBus = EventBus.init();

// Listen for events
eventBus.onEvent({
  event: UserEvents["role.assigned"],
  callback: (data) => {
    console.log("New role assigned:", data.role);
  },
});

// Emit events
eventBus.emitEvent({
  event: UserEvents["role.assigned"],
  data: RoleAssignedEventData.from({
    userId: "123",
    role: "editor",
    assignedBy: "456",
  }),
});
```

### Advanced Features

#### Correlation IDs

Use correlation IDs to track related events:

```typescript
// Emit with correlation ID
eventBus.emitEvent({
  event: UserEvents["role.assigned"],
  data: RoleAssignedEventData.from({
    /* ... */
  }),
  correlationId: "request-123",
});

// Access correlation ID in listener
eventBus.onEvent({
  event: UserEvents["role.assigned"],
  callback: (data, correlationId) => {
    console.log(`Event ${correlationId}:`, data);
  },
});
```

#### Buffered Events

Wait for multiple related events before processing:

```typescript
// Listen for multiple events
eventBus.onDependentEvents({
  events: [UserEvents["profile.created"], UserEvents["role.assigned"]],
  callback: (buffer) => {
    // Access events by their names
    const profile = buffer[UserEvents["profile.created"]];
    const role = buffer[UserEvents["role.assigned"]];
    console.log("User setup complete:", { profile, role });
  },
});

// Emit related events
eventBus.emitEvent({
  event: UserEvents["profile.created"],
  data: ProfileCreatedEventData.from({
    /* ... */
  }),
  correlationId: "request-123",
});

eventBus.emitEvent({
  event: UserEvents["role.assigned"],
  data: RoleAssignedEventData.from({
    /* ... */
  }),
  correlationId: "request-123",
});
```

## License

MIT
