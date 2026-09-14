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

/** @type {Record<string, string | boolean>} */
const DEFAULTS = {
	write: false,
	verbose: false,
	root: process.env.INIT_CWD || process.cwd(),
	schemas: "./schemas/**/*.json",
	declarations: "declarations",
	source: "./lib/**/*.js",
	types: "types.d.ts",
	templateLiterals: true
};

/**
 * @param {string} name a flag as it was written on the command line
 * @returns {string} the matching `Argv` key
 */
const toCamelCase = (name) =>
	name.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());

/**
 * Reads the flags the generators take. A boolean is set by naming it and
 * cleared by prefixing it with `no-`; a string takes the next argument or the
 * one after its `=`.
 * @param {string[]} args the arguments to read, without node and the script
 * @returns {Argv} every option, defaulted where the arguments name none
 */
const parseArgv = (args) => {
	const argv = { ...DEFAULTS };
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg.startsWith("--")) continue;
		const at = arg.indexOf("=");
		const written = at === -1 ? arg.slice(2) : arg.slice(2, at);
		const negated = written.startsWith("no-");
		const name = toCamelCase(negated ? written.slice(3) : written);
		if (!(name in DEFAULTS)) {
			throw new Error(`Unknown option "${arg}"`);
		}
		if (typeof DEFAULTS[name] === "boolean") {
			argv[name] = !negated;
			continue;
		}
		const value = at === -1 ? args[++i] : arg.slice(at + 1);
		if (value === undefined) {
			throw new Error(`Option "${arg}" needs a value`);
		}
		argv[name] = value;
	}
	return /** @type {Argv} */ (/** @type {unknown} */ (argv));
};

module.exports = parseArgv(process.argv.slice(2));
