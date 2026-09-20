/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {EXPECTED_ANY} TerserModules terser's own modules */
/** @typedef {{ minify: typeof import("terser").minify, phases: string[] }} Terser what a caller minifies with */

/**
 * A phase webpack implements in place of terser's. `supports` reads the
 * installed terser and says whether this phase still fits it.
 * @typedef {{ name: string, supports: (modules: TerserModules) => boolean, install: (modules: TerserModules) => void }} Phase
 */

// The phases webpack has taken over. Each one replaces a method on the
// minifier's own classes and is expected to write exactly what it wrote, only
// faster; a new phase is added here and nowhere else.
/** @type {Phase[]} */
const PHASES = [require("./syntax-mangle")];

/** @type {Promise<Terser> | undefined} */
let loading;

/**
 * terser's sources, which the published entry point does not expose — it is a
 * bundle whose only exports are `minify` and friends, while a phase has to
 * reach the classes behind them.
 * @returns {Promise<TerserModules & { minify: typeof import("terser").minify }>} the modules
 */
const loadSources = async () => {
	const path = require("path");
	const { pathToFileURL } = require("url");

	// Built at call time so a runtime without dynamic import fails here rather
	// than when this file is first read.
	// eslint-disable-next-line no-new-func
	const importModule = new Function("specifier", "return import(specifier)");
	const directory = path.dirname(require.resolve("terser/package.json"));
	/**
	 * @param {string} file a file in terser's `lib`
	 * @returns {Promise<EXPECTED_ANY>} the module
	 */
	const at = (file) =>
		importModule(pathToFileURL(path.join(directory, "lib", file)).href);
	// One at a time: asking for several at once leaves an embedder's module
	// loader linking a module that another import is still reading.
	const ast = await at("ast.js");
	// Read for its effect: it installs `transform` on every node class.
	await at("transform.js");
	const scope = await at("scope.js");
	const parse = await at("parse.js");
	const { minify } = await at("minify.js");
	return { ast, scope, parse, minify };
};

/**
 * terser, carrying whichever phases webpack owns and this terser still fits.
 * Falls back to the published entry point — a terser that moved what a phase
 * reads, or a runtime that cannot import the sources, minifies as it always
 * did. The answer is cached, so a worker loads terser once.
 * @returns {Promise<Terser>} terser and the phases installed into it
 */
const load = () => {
	if (loading !== undefined) return loading;
	loading = loadSources()
		.then((modules) => {
			/** @type {string[]} */
			const phases = [];
			for (const phase of PHASES) {
				if (!phase.supports(modules)) continue;
				phase.install(modules);
				phases.push(phase.name);
			}
			return { minify: modules.minify, phases };
		})
		.catch(() => ({ minify: require("terser").minify, phases: [] }));
	return loading;
};

module.exports = { load, PHASES };
