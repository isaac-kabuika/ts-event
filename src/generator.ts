import * as fs from "fs";
import * as path from "path";
import { EventsConfig, Config } from "./types";

export class EventGenerator {
  private readonly config: Config & { eventFiles: string[] };

  constructor(config: Config & { eventFiles: string[] }) {
    this.config = config;
  }

  private generateEventClass(eventName: string, schema: any): string {
    const className = eventName;

    const interfaceProps = Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => {
        const type =
          value.type === "string"
            ? "string"
            : value.type === "number"
            ? "number"
            : value.type === "boolean"
            ? "boolean"
            : "any";
        return `  ${key}: ${type};`;
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
      throw new Error(\`Invalid ${className} data: \${JSON.stringify(validate.errors)}\`);
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
