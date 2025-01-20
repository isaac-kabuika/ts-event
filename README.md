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

Create event schema files in your schema directory (e.g. `events/schema/user-events.json`):

```json
{
  "domain": "user",
  "events": {
    "profile.updated": {
      "schema": {
        "type": "object",
        "properties": {
          "userId": { "type": "string" },
          "changes": {
            "type": "object",
            "additionalProperties": true
          }
        },
        "required": ["userId"],
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

### 4. Use Generated Types

```typescript
import {
  userEvents,
  profileUpdatedEventData,
  profileUpdatedEventPayload,
} from "./events/generated/user-events";

// Create type-safe event with validation
const event = profileUpdatedEventData.from({
  userId: "123",
  changes: { name: "John" },
});

// Get event type string
const eventType = userEvents["profile.updated"]; // "user:profile.updated"

// Type casting example
function handleEvent(type: string, data: any) {
  if (type === userEvents["profile.updated"]) {
    // data is now typed as profileUpdatedEventPayload
    const payload = data as profileUpdatedEventPayload;
    console.log(payload.userId);
  }
}
```

## License

MIT
