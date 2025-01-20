export interface EventDefinition {
  schema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface EventsConfig {
  prefix: string;
  events: Record<string, EventDefinition>;
}

export interface Config {
  schemaDir: string;
  outputDir: string;
  typePrefix?: string;
  typeSuffix?: string;
}
