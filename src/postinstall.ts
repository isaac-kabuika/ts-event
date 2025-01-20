import * as fs from "fs";
import * as path from "path";

function findProjectRoot(): string {
  // When installed as a dependency, this script runs from node_modules
  // So we need to go up two levels to reach the project root
  return path.join(__dirname, "../../..");
}

function createConfigFile() {
  const templatePath = path.join(__dirname, "../ts-event.config.json.template");
  const projectRoot = findProjectRoot();
  const targetPath = path.join(projectRoot, "ts-event.config.json");

  // Don't overwrite existing config
  if (fs.existsSync(targetPath)) {
    console.log("ts-event.config.json already exists, skipping creation");
    return;
  }

  try {
    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(targetPath, template);
    console.log("Created ts-event.config.json with default configuration");
  } catch (error) {
    console.error("Failed to create config file:", error);
  }
}

createConfigFile();
