"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const json_schema_to_zod_1 = require("json-schema-to-zod");
class EventGenerator {
    constructor(config) {
        this.config = config;
    }
    generateEventClass(eventName, schema) {
        const className = eventName
            .split(".")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("");
        // Add correlationId to schema properties
        const mergedSchema = {
            ...schema,
            properties: {
                ...schema.properties,
                correlationId: {
                    type: "string",
                    description: "Optional correlation ID for event tracking",
                },
            },
            required: (schema.required || []).filter((req) => req !== "correlationId"),
        };
        // Convert merged JSON Schema to Zod schema
        const zodSchemaStr = (0, json_schema_to_zod_1.jsonSchemaToZod)(mergedSchema, { module: "none" })
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
    generateFile(config) {
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
    generate() {
        for (const eventFile of this.config.eventFiles) {
            const config = JSON.parse(fs.readFileSync(eventFile, "utf-8"));
            const outputPath = path.join(this.config.outputDir, `${config.domain}-events.ts`);
            if (!fs.existsSync(this.config.outputDir)) {
                fs.mkdirSync(this.config.outputDir, { recursive: true });
            }
            fs.writeFileSync(outputPath, this.generateFile(config));
            console.log(`Generated ${outputPath}`);
        }
    }
}
exports.EventGenerator = EventGenerator;
