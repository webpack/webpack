/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { root } = require("./argv");

const configPath = path.resolve(root, "tsconfig.json");
const configContent = fs.readFileSync(configPath, "utf8");
const configJsonFile = ts.parseJsonText(configPath, configContent);
const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
	configJsonFile,
	ts.sys,
	root,
	{ noEmit: true }
);
const { fileNames, errors, options } = parsedConfig;

// A config error leaves `fileNames` empty or the options half-read, so the
// program would be built over nothing and report a clean run
if (errors.length > 0) {
	for (const error of errors) {
		console.error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
	}
	throw new Error(`Unable to read ${configPath}`);
}

module.exports = ts.createProgram(fileNames, options);
