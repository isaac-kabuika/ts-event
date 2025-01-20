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
function findProjectRoot() {
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
    }
    catch (error) {
        console.error("Failed to create config file:", error);
    }
}
createConfigFile();
