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
const { fileNames, options } = parsedConfig;

module.exports = ts.createProgram(fileNames, options);
