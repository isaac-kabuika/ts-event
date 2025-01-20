# ts-event

A TypeScript event generator library that creates strongly-typed event definitions with runtime validation.

## Installation

```bash
npm install ts-event
```

## Usage

1. After installation, a `safe-event.config.json` file will be created in your project root with default settings. You can modify it to match your needs:

```json
{
  "schemaDir": "./event-schemas",
  "outputDir": "./src/generated",
  "typePrefix": "",
  "typeSuffix": "Event"
}
```

Configuration options:

- `schemaDir`: Directory containing your JSON schema files
- `outputDir`: Directory where generated TypeScript files will be placed
- `typePrefix`: Optional prefix for generated type names
- `typeSuffix`: Optional suffix for generated type names (defaults to "Event")

2. Create your event schema files in the schema directory (e.g. `event-schemas/backend-events.json`). The schema format follows the [Ajv JSON Schema specification](https://ajv.js.org/json-schema.html):

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

The schema objects support all JSON Schema keywords supported by Ajv including:

- Basic validation: type, enum, const
- Numbers: maximum/minimum, multipleOf
- Strings: maxLength/minLength, pattern, format
- Arrays: maxItems/minItems, uniqueItems, items
- Objects: properties, required, additionalProperties
- Compound keywords: allOf, anyOf, oneOf, not
- And more - see the [full Ajv specification](https://ajv.js.org/json-schema.html)

3. Generate TypeScript types using the CLI:

```bash
npx safe-event
```

4. Use the generated types in your code:

```typescript
import {
  BackendEvents,
  CreateUserEvent, // With default suffix
  SendMessageEvent,
} from "./generated/backend-events";

// Example with custom prefix and suffix in config:
// typePrefix: "Base", typeSuffix: "Data"
// import { BaseCreateUserData, BaseSendMessageData } from "./generated/backend-events";

// Type-safe event creation with runtime validation
const userEvent = CreateUserEvent.from({
  userId: "123",
  timestamp: Date.now(),
});

// Access validated payload
console.log(userEvent.payload.userId);

// Use enum for event names
console.log(BackendEvents.CREATE_USER); // "create-user"

// Invalid data will throw runtime error
try {
  SendMessageEvent.from({
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
- Customizable type naming with prefixes and suffixes
- Support for multiple schema files
- Configurable output directory

## License

MIT
