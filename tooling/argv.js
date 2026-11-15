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
 * @property {string} declarations folder holding the option types that are not a plugin's own
 * @property {string} types output file for types declarations
 * @property {boolean} templateLiterals whether template literal types are allowed
 * @property {string} base git revision the types coverage report compares escape-hatch type counts with
 * @property {string} baseCounts `coverage/type-counts.json` of a types coverage run on the base, for the report to compare its inferred `any` and untyped identifiers with
 */

/** @typedef {"write" | "verbose" | "templateLiterals"} BooleanOption the flags set by naming them */

/** @type {Argv} */
const DEFAULTS = {
	write: false,
	verbose: false,
	root: process.env.INIT_CWD || process.cwd(),
	schemas: "./schemas/**/*.json",
	declarations: "declarations",
	types: "types.d.ts",
	templateLiterals: true,
	base: "",
	baseCounts: ""
};

/**
 * @param {string} name a flag as it was written on the command line
 * @returns {string} the matching `Argv` key
 */
const toCamelCase = (name) =>
	name.replace(/-([a-z])/g, (_match, /** @type {string} */ letter) =>
		letter.toUpperCase()
	);

/**
 * @param {string} name a camel cased flag name
 * @returns {name is keyof Argv} whether the generators take that flag
 */
const isOption = (name) => name in DEFAULTS;

/**
 * @param {keyof Argv} name a flag the generators take
 * @returns {name is BooleanOption} whether the flag is set by naming it
 */
const isBooleanOption = (name) => typeof DEFAULTS[name] === "boolean";

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
		if (!isOption(name)) {
			throw new Error(`Unknown option "${arg}"`);
		}
		if (isBooleanOption(name)) {
			argv[name] = !negated;
			continue;
		}
		const value = at === -1 ? args[++i] : arg.slice(at + 1);
		if (value === undefined) {
			throw new Error(`Option "${arg}" needs a value`);
		}
		argv[name] = value;
	}
	return argv;
};

module.exports = parseArgv(process.argv.slice(2));
