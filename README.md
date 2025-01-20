# ts-event

A TypeScript event generator library that creates strongly-typed event definitions with runtime validation.

## Installation

```bash
npm install ts-event
```

## Usage

1. Create a configuration file `.ts-event.config.json` in your project root:

```json
{
  "eventFiles": ["./src/events/backend-events.json"],
  "outputDir": "./src/events/generated"
}
```

2. Define your events in JSON files (e.g. `backend-events.json`):

```json
{
  "prefix": "backend",
  "events": {
    "CREATE_USER": {
      "schema": {
        "type": "object",
        "properties": {
          "userId": { "type": "string" },
          "timestamp": { "type": "number" }
        },
        "required": ["userId", "timestamp"],
        "additionalProperties": false
      }
    },
    "SEND_MESSAGE": {
      "schema": {
        "type": "object",
        "properties": {
          "messageId": { "type": "string" },
          "content": { "type": "string" },
          "senderId": { "type": "string" }
        },
        "required": ["messageId", "content", "senderId"],
        "additionalProperties": false
      }
    }
  }
}
```

3. Generate TypeScript types using the CLI:

```bash
npx ts-event
```

4. Use the generated types in your code:

```typescript
import {
  BackendEvents,
  CreateUserEventData,
  SendMessageEventData,
} from "./events/generated/backend-events";

// Type-safe event creation with runtime validation
const userEvent = CreateUserEventData.from({
  userId: "123",
  timestamp: Date.now(),
});

// Access validated payload
console.log(userEvent.payload.userId);

// Use enum for event names
console.log(BackendEvents.CREATE_USER); // "create-user"

// Invalid data will throw runtime error
try {
  SendMessageEventData.from({
    messageId: "abc",
    // Missing required fields will fail validation
  });
} catch (error) {
  console.error("Invalid event data:", error);
}
```

## Features

- Generate TypeScript types from JSON schema definitions
- Runtime validation using [ajv](https://github.com/ajv-validator/ajv)
- Type-safe event payload access
- Enum generation for event names
- Support for multiple event definition files
- Configurable output directory

## License

MIT
