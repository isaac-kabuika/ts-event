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

## License

MIT
