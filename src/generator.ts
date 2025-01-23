import * as fs from "fs";
import * as path from "path";
import { EventsConfig, Config } from "./types";

export class EventGenerator {
  private readonly config: Config & { eventFiles: string[] };

  constructor(config: Config & { eventFiles: string[] }) {
    this.config = config;
  }

  private getTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      // Handle references - extract the type name from the reference
      return schema.$ref.split("/").pop();
    }

    // Handle enum types
    if (schema.enum) {
      return schema.enum
        .map((value: any) => {
          if (typeof value === "string") {
            return `"${value}"`;
          }
          return value;
        })
        .join(" | ");
    }

    // Handle const values
    if (schema.const !== undefined) {
      if (typeof schema.const === "string") {
        return `"${schema.const}"`;
      }
      return typeof schema.const;
    }

    switch (schema.type) {
      case "string":
        // Handle string formats and patterns
        if (schema.pattern) {
          return "string"; // Could potentially generate a more specific type using template literal types
        }
        return "string";
      case "number":
      case "integer":
        // Handle numeric restrictions
        if (schema.enum) {
          return schema.enum.join(" | ");
        }
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        if (schema.items) {
          const itemType = this.getTypeFromSchema(schema.items);
          let arrayType = `${itemType}[]`;
          // Handle tuple types with fixed length
          if (
            schema.minItems &&
            schema.maxItems &&
            schema.minItems === schema.maxItems
          ) {
            arrayType = `[${Array(schema.minItems).fill(itemType).join(", ")}]`;
          }
          return arrayType;
        }
        return "any[]";
      case "object":
        if (schema.properties) {
          const props = Object.entries(schema.properties)
            .map(([key, value]: [string, any]) => {
              const type = this.getTypeFromSchema(value);
              const isRequired = schema.required?.includes(key);
              return `${key}${isRequired ? "" : "?"}: ${type}`;
            })
            .join("; ");
          return `{ ${props} }`;
        }
        // Handle additional properties
        if (schema.additionalProperties) {
          if (typeof schema.additionalProperties === "object") {
            const valueType = this.getTypeFromSchema(
              schema.additionalProperties
            );
            return `Record<string, ${valueType}>`;
          }
          return "Record<string, any>";
        }
        return "Record<string, any>";
      default:
        // Handle oneOf, anyOf, allOf
        if (schema.oneOf) {
          return schema.oneOf
            .map((s: any) => this.getTypeFromSchema(s))
            .join(" | ");
        }
        if (schema.anyOf) {
          return schema.anyOf
            .map((s: any) => this.getTypeFromSchema(s))
            .join(" | ");
        }
        if (schema.allOf) {
          return schema.allOf
            .map((s: any) => this.getTypeFromSchema(s))
            .join(" & ");
        }
        return "any";
    }
  }

  private generateEventClass(eventName: string, schema: any): string {
    // Convert dot notation to camelCase class name
    const className = eventName
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    const interfaceProps = Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => {
        const type = this.getTypeFromSchema(value);
        const isRequired = schema.required?.includes(key);
        return `  ${key}${isRequired ? "" : "?"}: ${type};`;
      })
      .join("\n");

    return `
export class ${className}EventData {
  constructor(private readonly data: unknown) {
    // Handle message format which might wrap our data
    const payload = typeof data === 'object' && data !== null && 'data' in data
      ? (data as any).data
      : data;

    this.data = payload;
    this.validate();
  }

  private validate(): void {
    const validate = JsonValidator.init().compile(${JSON.stringify(schema)});
    if (!validate(this.data)) {
      throw new Error(\`Invalid ${eventName} data: \${JSON.stringify(validate.errors)}\`);
    }
  }

  get payload(): ${className}EventPayload {
    return this.data as ${className}EventPayload;
  }

  static from(data: ${className}EventPayload): ${className}EventData {
    return new ${className}EventData(data);
  }
}

export interface ${className}EventPayload {
${interfaceProps}
}
`;
  }

  private generateFile(config: EventsConfig): string {
    const domain = config.domain;

    const enumDef = `export const ${domain}Events = {
${Object.keys(config.events)
  .map((key) => `  "${key}": "${domain}:${key}"`)
  .join(",\n")}
} as const;

export type ${domain}EventTypes = typeof ${domain}Events[keyof typeof ${domain}Events];
`;

    const validator = `
import Ajv from "ajv";

class JsonValidator {
  private static instance: Ajv;
  public static init(): Ajv {
    if (!JsonValidator.instance) {
      JsonValidator.instance = new Ajv();
    }
    return JsonValidator.instance;
  }
}`;

    const eventClasses = Object.entries(config.events)
      .map(([name, def]) => this.generateEventClass(name, def.schema))
      .join("\n\n");

    return `// Generated code - do not edit
${validator}

${enumDef}

${eventClasses}
`;
  }

  public generate(): void {
    for (const eventFile of this.config.eventFiles) {
      const config = JSON.parse(
        fs.readFileSync(eventFile, "utf-8")
      ) as EventsConfig;

      const outputPath = path.join(
        this.config.outputDir,
        `${config.domain}-events.ts`
      );

      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, this.generateFile(config));
      console.log(`Generated ${outputPath}`);
    }
  }
}
