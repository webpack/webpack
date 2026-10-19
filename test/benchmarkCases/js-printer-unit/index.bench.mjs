// Printing is the other half of `js-parser-unit`: the printer's own parse, then
// the program written back out. Every fixture runs in the three modes the
// printer has. `print` neither compresses nor mangles, so it is the floor all
// three share: parse and output. `mangle` adds renaming, and `minify` is the
// default — compress and mangle. So `mangle - print` is what renaming costs and
// `minify - mangle` what compressing costs. The whole minimizer, workers and
// options included, is `js-minifier-unit`'s.

import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/javascript/syntax")} */
const jsSyntax = require("../../../lib/javascript/syntax.js");

const { minify } = await jsSyntax.printer.load();

/** @type {[string, string, boolean][]} name, source, whether it is a module */
const FIXTURES = [
	[
		"lodash.js",
		fs.readFileSync(require.resolve("lodash/lodash.js"), "utf8"),
		false
	],
	// "three" import condition resolves to build/three.module.js
	[
		"three.module.js",
		fs.readFileSync(fileURLToPath(import.meta.resolve("three")), "utf8"),
		true
	]
];

/** @type {[string, { compress?: false, mangle?: boolean }][]} mode, options */
const MODES = [
	["print", { compress: false, mangle: false }],
	["mangle", { compress: false, mangle: true }],
	["minify", {}]
];

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	for (const [name, source, module] of FIXTURES) {
		for (const [mode, options] of MODES) {
			bench.add(
				`unit benchmark "js-printer-unit", ${mode} (${name})`,
				async () => {
					await minify({ [name]: source }, { ...options, module });
				}
			);
		}
	}
};
