#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { program } from "commander";
import { EventGenerator } from "./generator";
import { Config } from "./types";

const CONFIG_FILE = "safe-event.config.json";

program
  .name("safe-event")
  .description("Generate TypeScript event classes from JSON schemas")
  .option("-c, --config <path>", "Path to config file", CONFIG_FILE)
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config);

      if (!fs.existsSync(configPath)) {
        console.error(`Config file not found: ${configPath}`);
        console.error(
          `Please create a ${CONFIG_FILE} file in your project root.`
        );
        process.exit(1);
      }

      const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

      // Resolve paths relative to config file location
      const configDir = path.dirname(configPath);
      const schemaDir = path.resolve(configDir, config.schemaDir);
      config.outputDir = path.resolve(configDir, config.outputDir);

      // Find all JSON files in the schema directory
      const schemaFiles = await glob("**/*.json", { cwd: schemaDir });
      if (schemaFiles.length === 0) {
        console.error(`No JSON schema files found in ${schemaDir}`);
        process.exit(1);
      }

      // Convert paths to absolute
      const eventFiles = schemaFiles.map((file) => path.join(schemaDir, file));

      const generator = new EventGenerator({
        ...config,
        eventFiles,
      });

      generator.generate();

      console.log("Event generation completed successfully!");
    } catch (error) {
      console.error("Error generating events:", error);
      process.exit(1);
    }
  });

program.parse();
