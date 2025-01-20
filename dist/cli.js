#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const commander_1 = require("commander");
const generator_1 = require("./generator");
const CONFIG_FILE = "ts-event.config.json";
commander_1.program
    .name("ts-event")
    .description("Generate TypeScript event classes from JSON schemas")
    .option("-c, --config <path>", "Path to config file", CONFIG_FILE)
    .action(async (options) => {
    try {
        const configPath = path.resolve(process.cwd(), options.config);
        if (!fs.existsSync(configPath)) {
            console.error(`Config file not found: ${configPath}`);
            console.error(`Please create a ${CONFIG_FILE} file in your project root.`);
            process.exit(1);
        }
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        // Resolve paths relative to config file location
        const configDir = path.dirname(configPath);
        config.eventFiles = config.eventFiles.map((file) => path.resolve(configDir, file));
        config.outputDir = path.resolve(configDir, config.outputDir);
        const generator = new generator_1.EventGenerator(config);
        generator.generate();
        console.log("Event generation completed successfully!");
    }
    catch (error) {
        console.error("Error generating events:", error);
        process.exit(1);
    }
});
commander_1.program.parse();
