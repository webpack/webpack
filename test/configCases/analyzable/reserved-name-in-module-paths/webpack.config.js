"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Writes a module into a directory named `directoryName`, so its path in the
 * module header comment and its module id spell that name.
 * @param {string} root where the directory is made
 * @param {string} directoryName the directory's name
 * @param {string} name the module's name
 * @returns {string} the module's path
 */
const writeModule = (root, directoryName, name) => {
	const directory = path.join(root, directoryName);
	fs.mkdirSync(directory, { recursive: true });
	const file = path.join(directory, `${name}.js`);
	fs.writeFileSync(
		file,
		`(global.reservedNameDirectories = global.reservedNameDirectories || []).push(${JSON.stringify(name)});\n`
	);
	return file;
};

// The fill pass of ESM output scans every asset, module header comments
// included: a directory name spelling a reserved name must keep them closed.
/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	// The output directory is emptied before the build, so the modules sit beside it.
	const root = `${testPath}-src`;
	// One level below the modules, so their paths read `../<directory name>/`.
	const context = path.join(root, "context");
	fs.mkdirSync(context, { recursive: true });
	return {
		target: "node",
		mode: "development",
		devtool: false,
		context,
		entry: [
			path.resolve(__dirname, "index.js"),
			writeModule(root, "hash*@@webpackFullHash-0@@", "hash"),
			// the payload spells a literal `*/`
			writeModule(
				root,
				"@@webpackAnalyzableChunk:W1sibGl0ZXJhbCIsIiovIl1d@@",
				"chunk"
			)
		],
		output: { module: true, pathinfo: true }
	};
};
