import * as fs from "fs";
import * as path from "path";

const srcPath = path.join(__dirname, "../safe-event.config.json.template");
const destPath = path.join(
  __dirname,
  "../dist/safe-event.config.json.template"
);

fs.copyFileSync(srcPath, destPath);
