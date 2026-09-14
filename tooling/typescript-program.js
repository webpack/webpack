/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const ts = require("typescript");
const { root } = require("./argv");

/**
 * @param {ts.Diagnostic} diagnostic info
 * @returns {void}
 */
const printDiagnostic = (diagnostic) => {
	if (diagnostic.file && typeof diagnostic.start === "number") {
		const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
			diagnostic.start
		);
		const message = ts.flattenDiagnosticMessageText(
			diagnostic.messageText,
			"\n"
		);
		console.error(
			`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
		);
	} else {
		console.error(
			ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
		);
	}
};

/**
 * Builds the program one `tsconfig.json` of the repository describes.
 * @param {string} configName the config's filename, relative to the root
 * @returns {ts.Program} the program over every file that config includes
 */
const createTypeScriptProgram = (configName) => {
	const configPath = path.resolve(root, configName);
	const configContent = ts.sys.readFile(configPath);
	if (!configContent) {
		throw new Error(`Empty config file ${configPath}`);
	}
	const configJsonFile = ts.parseJsonText(configPath, configContent);
	const { fileNames, errors, options } =
		ts.parseJsonSourceFileConfigFileContent(configJsonFile, ts.sys, root, {
			noEmit: true
		});
	// A config error leaves `fileNames` empty or the options half-read, so the
	// program would be built over nothing and report a clean run
	if (errors.length > 0) {
		for (const error of errors) {
			printDiagnostic(error);
		}
		throw new Error(`Unable to read ${configPath}`);
	}
	return ts.createProgram(fileNames, options);
};

module.exports = createTypeScriptProgram;
module.exports.printDiagnostic = printDiagnostic;
