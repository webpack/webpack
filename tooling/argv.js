/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @typedef {object} Argv
 * @property {boolean} write whether to write updated files instead of checking them
 * @property {boolean} verbose whether to print more info to output
 * @property {string} root root repository directory
 * @property {string} schemas glob to find schemas in the root directory
 * @property {string} declarations output folder for declarations generated from schemas
 * @property {string} source glob to find source code in the root directory
 * @property {string} types output file for types declarations
 * @property {boolean} templateLiterals whether template literal types are allowed
 */

module.exports = /** @type {Argv} */ (
	require("yargs")
		.boolean("write")
		.describe(
			"write",
			"Write updated files to disk, otherwise it only checks if they are correct."
		)

		.boolean("verbose")
		.describe("verbose", "Print more info to output.")

		.string("root")
		.describe(
			"root",
			"Root repository directory (optional if calling from package.json scripts)."
		)
		.default(
			"root",
			process.env.INIT_CWD || process.cwd(),
			"The root directory from calling package.json or the current directory"
		)

		.string("schemas")
		.describe("schemas", "Glob to find schemas in root directory.")
		.default("schemas", "./schemas/**/*.json")

		.string("declarations")
		.describe(
			"declarations",
			"Output folder for declarations generated from schemas."
		)
		.default("declarations", "declarations")

		.string("source")
		.describe("source", "Glob to find source code in root directory.")
		.default("source", "./lib/**/*.js")

		.string("types")
		.describe("types", "Output file for types declarations.")
		.default("types", "types.d.ts")

		.boolean("templateLiterals")
		.default("templateLiterals", true)
		.describe("templateLiterals", "Allow template literal types.")

		.parse()
);
