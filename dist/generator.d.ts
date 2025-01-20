import { Config } from "./types";
export declare class EventGenerator {
    private readonly config;
    constructor(config: Config & {
        eventFiles: string[];
    });
    private generateEventClass;
    private generateFile;
    generate(): void;
}
