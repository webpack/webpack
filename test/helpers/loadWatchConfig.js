"use strict";

const fs = require("fs");
const path = require("path");

const casesDirectory = `${path.join(__dirname, "../watchCases")}${path.sep}`;

/** @typedef {(require: NodeRequire, module: { exports: unknown }, exports: unknown, filename: string, directory: string) => void} ModuleFunction */

/**
 * Re-evaluates fixture modules while sharing webpack and the watch-step helper.
 * @param {string} filename configuration path
 * @returns {import("./prepareOptions").ConfigModule} independent configuration
 */
const loadWatchConfig = (filename) => {
	/** @type {Map<string, { exports: unknown }>} */
	const modules = new Map();
	/**
	 * @param {string} filename resolved module path
	 * @returns {unknown} module exports
	 */
	const load = (filename) => {
		if (!filename.startsWith(casesDirectory)) return require(filename);
		const cached = modules.get(filename);
		if (cached) return cached.exports;
		const module = { exports: /** @type {unknown} */ ({}) };
		modules.set(filename, module);
		const source = fs.readFileSync(filename, "utf8");
		if (filename.endsWith(".json")) {
			module.exports = JSON.parse(source);
		} else {
			/**
			 * @param {string} request module request
			 * @param {{ paths?: string[] }=} options resolution options
			 * @returns {string} resolved module path
			 */
			const resolve = (request, options) =>
				require.resolve(request, {
					paths: [path.dirname(filename)],
					...options
				});
			const localRequire = Object.assign(
				(/** @type {string} */ request) => load(resolve(request)),
				require,
				{ resolve: Object.assign(resolve, require.resolve) }
			);
			// Keep functions in Jest's realm for webpack's instanceof checks.
			const evaluate = /** @type {ModuleFunction} */ (
				// eslint-disable-next-line no-new-func
				new Function(
					"require",
					"module",
					"exports",
					"__filename",
					"__dirname",
					`${source}\n//# sourceURL=${filename}`
				)
			);
			evaluate.call(
				module.exports,
				localRequire,
				module,
				module.exports,
				filename,
				path.dirname(filename)
			);
		}
		return module.exports;
	};
	return /** @type {import("./prepareOptions").ConfigModule} */ (
		load(filename)
	);
};

module.exports = loadWatchConfig;
