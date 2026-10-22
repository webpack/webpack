"use strict";

const { isDeepStrictEqual } = require("util");
const webpack = require("../../../../");
const DelegatedModule = require("../../../../lib/dll/DelegatedModule");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Compiler} Compiler */

const PLUGIN_NAME = "RestoredDelegatedModuleTest";

const DELEGATE_DATA = {
	id: "./item.js",
	buildMeta: { exportsType: "namespace", strictHarmonyModule: true },
	exports: ["default", "old"]
};

/** @type {string | undefined} */
let delegatedIdentifier;

/**
 * @param {Compilation} compilation the compilation
 * @param {string} message what is not as expected
 * @returns {void}
 */
const report = (compilation, message) => {
	compilation.errors.push(new webpack.WebpackError(message));
};

/**
 * Records the delegated module the Dll plugins create, for a later build to
 * restore from the pack.
 * @param {Compilation} compilation the compilation
 * @returns {void}
 */
const recordDelegatedModule = (compilation) => {
	compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
		const module = [...modules].find((m) => m instanceof DelegatedModule);
		if (!module) return report(compilation, "no delegated module was built");
		delegatedIdentifier = module.identifier();
	});
};

/**
 * Restores the recorded delegated module from the pack, which a build without
 * the Dll plugins has to do from what the pack alone carries.
 * @param {Compilation} compilation the compilation
 * @returns {void}
 */
const restoreDelegatedModule = (compilation) => {
	compilation.hooks.finishModules.tapAsync(
		PLUGIN_NAME,
		(_modules, callback) => {
			const identifier = /** @type {string} */ (delegatedIdentifier);
			compilation
				.getCache("Compilation/modules")
				.get(identifier, null, (err, module) => {
					if (err) {
						report(compilation, `restoring failed: ${err.message}`);
					} else if (!(module instanceof DelegatedModule)) {
						report(compilation, "the delegated module was not restored");
					} else if (module.identifier() !== identifier) {
						report(compilation, `restored as ${module.identifier()}`);
					} else if (!isDeepStrictEqual(module.delegateData, DELEGATE_DATA)) {
						report(compilation, "the delegate data was not restored");
					} else if (
						!module.buildMeta ||
						module.buildMeta.exportsType !== "namespace" ||
						module.buildMeta.strictHarmonyModule !== true
					) {
						report(compilation, "the build meta was not restored");
					}
					callback();
				});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	// the last build reports an error, and its bundle still has to run
	optimization: {
		concatenateModules: false,
		minimize: false,
		emitOnErrors: true
	},
	plugins: [
		/**
		 * @param {Compiler} compiler the compiler
		 */
		(compiler) => {
			// only the first build has the Dll plugins; the others restore from disk
			switch (String(currentWatchStep.step)) {
				case "0":
					new webpack.DllReferencePlugin({
						scope: "dll",
						manifest: {
							name: "function(id) { return { default: 'dll-default' }; }",
							content: { "./item.js": DELEGATE_DATA }
						}
					}).apply(compiler);
					compiler.hooks.compilation.tap(PLUGIN_NAME, recordDelegatedModule);
					break;
				case "1":
					compiler.hooks.compilation.tap(PLUGIN_NAME, restoreDelegatedModule);
					break;
			}
		}
	]
};
