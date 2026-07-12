/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @typedef {import("../../declarations/WebpackOptions.js").ChunkLoadingType} ChunkLoadingType */
/** @typedef {import("../Compiler.js").default} Compiler */

/** @typedef {Set<ChunkLoadingType>} ChunkLoadingTypes */

/** @type {WeakMap<Compiler, ChunkLoadingTypes>} */
const enabledTypes = new WeakMap();

/**
 * Returns enabled types.
 * @param {Compiler} compiler compiler
 * @returns {ChunkLoadingTypes} enabled types
 */
const getEnabledTypes = (compiler) => {
	let set = enabledTypes.get(compiler);
	if (set === undefined) {
		/** @type {ChunkLoadingTypes} */
		set = new Set();
		enabledTypes.set(compiler, set);
	}
	return set;
};

class EnableChunkLoadingPlugin {
	/**
	 * Creates an instance of EnableChunkLoadingPlugin.
	 * @param {ChunkLoadingType} type library type that should be available
	 */
	constructor(type) {
		/** @type {string} */
		this.type = type;
	}

	/**
	 * Updates enabled using the provided compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @param {ChunkLoadingType} type type of library
	 * @returns {void}
	 */
	static setEnabled(compiler, type) {
		getEnabledTypes(compiler).add(type);
	}

	/**
	 * Checks enabled.
	 * @param {Compiler} compiler the compiler instance
	 * @param {ChunkLoadingType} type type of library
	 * @returns {void}
	 */
	static checkEnabled(compiler, type) {
		if (!getEnabledTypes(compiler).has(type)) {
			throw new Error(
				`Chunk loading type "${type}" is not enabled. ` +
					"EnableChunkLoadingPlugin need to be used to enable this type of chunk loading. " +
					'This usually happens through the "output.enabledChunkLoadingTypes" option. ' +
					'If you are using a function as entry which sets "chunkLoading", you need to add all potential chunk loading types to "output.enabledChunkLoadingTypes". ' +
					`These types are enabled: ${[...getEnabledTypes(compiler)].join(", ")}`
			);
		}
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { type } = this;

		// Only enable once
		const enabled = getEnabledTypes(compiler);
		if (enabled.has(type)) return;
		enabled.add(type);

		if (typeof type === "string") {
			switch (type) {
				case "jsonp": {
					const JsonpChunkLoadingPlugin =
						/** @type {typeof import("../web/JsonpChunkLoadingPlugin.js").default} */ (
							require("../web/JsonpChunkLoadingPlugin.js")
						);

					new JsonpChunkLoadingPlugin().apply(compiler);
					break;
				}
				case "import-scripts": {
					const ImportScriptsChunkLoadingPlugin =
						/** @type {typeof import("../webworker/ImportScriptsChunkLoadingPlugin.js").default} */ (
							require("../webworker/ImportScriptsChunkLoadingPlugin.js")
						);

					new ImportScriptsChunkLoadingPlugin().apply(compiler);
					break;
				}
				case "require": {
					const CommonJsChunkLoadingPlugin =
						/** @type {typeof import("../node/CommonJsChunkLoadingPlugin.js").default} */ (
							require("../node/CommonJsChunkLoadingPlugin.js")
						);

					new CommonJsChunkLoadingPlugin({
						asyncChunkLoading: false
					}).apply(compiler);
					break;
				}
				case "async-node": {
					const CommonJsChunkLoadingPlugin =
						/** @type {typeof import("../node/CommonJsChunkLoadingPlugin.js").default} */ (
							require("../node/CommonJsChunkLoadingPlugin.js")
						);

					new CommonJsChunkLoadingPlugin({
						asyncChunkLoading: true
					}).apply(compiler);
					break;
				}
				case "import": {
					const ModuleChunkLoadingPlugin =
						/** @type {typeof import("../esm/ModuleChunkLoadingPlugin.js").default} */ (
							require("../esm/ModuleChunkLoadingPlugin.js")
						);

					new ModuleChunkLoadingPlugin().apply(compiler);
					break;
				}
				default:
					throw new Error(`Unsupported chunk loading type ${type}.
Plugins which provide custom chunk loading types must call EnableChunkLoadingPlugin.setEnabled(compiler, type) to disable this error.`);
			}
		} else {
			// TODO support plugin instances here
			// apply them to the compiler
		}
	}
}

export default EnableChunkLoadingPlugin;

export { EnableChunkLoadingPlugin as "module.exports" };
