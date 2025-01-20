import { Config } from "./types";
export declare class EventGenerator {
    private readonly config;
    constructor(config: Config);
    private generateEventClass;
    private generateFile;
    generate(): void;
}
