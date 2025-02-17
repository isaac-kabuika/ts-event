import * as fs from "fs";
import * as path from "path";
import { EventsConfig, Config } from "./types";
import { jsonSchemaToZod } from "json-schema-to-zod";

export class EventGenerator {
  private readonly config: Config & { eventFiles: string[] };

  constructor(config: Config & { eventFiles: string[] }) {
    this.config = config;
  }

  private generateEventClass(eventName: string, schema: any): string {
    const className = eventName
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    // Convert JSON Schema to Zod schema, strip out any imports
    const zodSchemaStr = jsonSchemaToZod(schema, { module: "none" })
      .replace(/^import.*$/gm, "")
      .replace(/^export default /gm, "");

    return `
const ${className}Schema = ${zodSchemaStr};

export type ${className}EventPayload = z.infer<typeof ${className}Schema>;

export class ${className}EventData {
  private readonly data: ${className}EventPayload;

  constructor(data: unknown) {
    const payload = typeof data === 'object' && data !== null && 'data' in data
      ? (data as any).data
      : data;

    this.data = ${className}Schema.parse(payload);
  }

  get payload(): ${className}EventPayload {
    return this.data;
  }

  static from(data: ${className}EventPayload): ${className}EventData {
    return new ${className}EventData(data);
  }
}`;
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

    const eventClasses = Object.entries(config.events)
      .map(([name, def]) => this.generateEventClass(name, def.schema))
      .join("\n\n");

    return `// Generated code - do not edit
import { z } from "zod";

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
