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
class EventGenerator {
    constructor(config) {
        this.config = config;
    }
    generateEventClass(eventName, schema) {
        // Convert dot notation to camelCase class name
        const className = eventName
            .split(".")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("");
        const interfaceProps = Object.entries(schema.properties)
            .map(([key, value]) => {
            const type = value.type === "string"
                ? "string"
                : value.type === "number"
                    ? "number"
                    : value.type === "boolean"
                        ? "boolean"
                        : "any";
            // Add optional modifier (?) for non-required fields
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
    generateFile(config) {
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
