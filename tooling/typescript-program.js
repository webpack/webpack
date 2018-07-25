const path = require("path");
const fs = require("fs");
const ts = require("typescript");

const rootPath = path.resolve(__dirname, "..");
const configPath = path.resolve(__dirname, "../tsconfig.json");
const configContent = fs.readFileSync(configPath, "utf-8");
const configJsonFile = ts.parseJsonText(configPath, configContent);
const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
	configJsonFile,
	ts.sys,
	rootPath,
	{ noEmit: true }
);
const { fileNames, options } = parsedConfig;

module.exports = ts.createProgram(fileNames, options);
