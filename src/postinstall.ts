import * as fs from "fs";
import * as path from "path";

function findProjectRoot(): string {
  // When running from node_modules/.bin/postinstall
  const nodeModulesPath = path.join(__dirname, "../..");
  const parentDir = path.dirname(nodeModulesPath);

  // Check if we're in node_modules
  if (path.basename(nodeModulesPath) === "node_modules") {
    return parentDir;
  }

  // Fallback to current directory if not in node_modules
  return process.cwd();
}

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function createDefaultSchema(schemaDir: string) {
  const defaultSchemaPath = path.join(schemaDir, "shared-events.json");

  if (!fs.existsSync(defaultSchemaPath)) {
    const defaultSchema = {
      domain: "shared",
      events: {
        "timestamp.created": {
          schema: {
            type: "object",
            properties: {
              comment: { type: "string" },
              unix: { type: "number" },
            },
            required: ["unix"],
            additionalProperties: false,
          },
        },
      },
    };

    fs.writeFileSync(defaultSchemaPath, JSON.stringify(defaultSchema, null, 2));
    console.log(`Created default schema file: ${defaultSchemaPath}`);
  }
}

function createConfigFile() {
  try {
    const projectRoot = findProjectRoot();
    console.log("Project root:", projectRoot);

    const templatePath = path.join(
      __dirname,
      "../safe-event.config.json.template"
    );
    console.log("Template path:", templatePath);

    if (!fs.existsSync(templatePath)) {
      console.error("Template file not found at:", templatePath);
      return;
    }

    const targetPath = path.join(projectRoot, "safe-event.config.json");
    console.log("Target config path:", targetPath);

    // Don't overwrite existing config
    if (fs.existsSync(targetPath)) {
      console.log("safe-event.config.json already exists, skipping creation");
      return;
    }

    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(targetPath, template);
    console.log("Created safe-event.config.json with default configuration");

    // Create the directory structure and default schema
    const config = JSON.parse(template);
    const schemaDir = path.join(projectRoot, config.schemaDir);
    const outputDir = path.join(projectRoot, config.outputDir);

    console.log("Creating schema directory at:", schemaDir);
    console.log("Creating output directory at:", outputDir);

    // Create directories
    ensureDirectoryExists(schemaDir);
    ensureDirectoryExists(outputDir);

    // Create default schema file
    createDefaultSchema(schemaDir);
  } catch (error) {
    console.error("Failed to create config file:", error);
    // Log the full error for debugging
    console.error("Full error:", error);
  }
}

// Add error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

createConfigFile();
