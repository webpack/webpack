/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").ChunkLoadingType} ChunkLoadingType */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../Compiler")} Compiler */

/** @type {WeakMap<Compiler, Set<ChunkLoadingType>>} */
const enabledTypes = new WeakMap();

const getEnabledTypes = compiler => {
	let set = enabledTypes.get(compiler);
	if (set === undefined) {
		set = new Set();
		enabledTypes.set(compiler, set);
	}
	return set;
};

class EnableChunkLoadingPlugin {
	/**
	 * @param {ChunkLoadingType} type library type that should be available
	 */
	constructor(type) {
		this.type = type;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @param {ChunkLoadingType} type type of library
	 * @returns {void}
	 */
	static setEnabled(compiler, type) {
		getEnabledTypes(compiler).add(type);
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @param {ChunkLoadingType} type type of library
	 * @returns {void}
	 */
	static checkEnabled(compiler, type) {
		if (!getEnabledTypes(compiler).has(type)) {
			throw new Error(
				`Library type "${type}" is not enabled. ` +
					"EnableChunkLoadingPlugin need to be used to enable this type of chunk loading. " +
					'This usually happens through the "output.enabledChunkLoadingTypes" option. ' +
					'If you are using a function as entry which sets "chunkLoading", you need to add all potential library types to "output.enabledChunkLoadingTypes". ' +
					Array.from(getEnabledTypes(compiler)).join(", ")
			);
		}
	}

	/**
	 * Apply the plugin
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
					const JsonpChunkLoadingPlugin = require("../web/JsonpChunkLoadingPlugin");
					new JsonpChunkLoadingPlugin().apply(compiler);
					break;
				}
				case "import-scripts": {
					const ImportScriptsChunkLoadingPlugin = require("../webworker/ImportScriptsChunkLoadingPlugin");
					new ImportScriptsChunkLoadingPlugin().apply(compiler);
					break;
				}
				case "require": {
					const CommonJsChunkLoadingPlugin = require("../node/CommonJsChunkLoadingPlugin");
					new CommonJsChunkLoadingPlugin({
						asyncChunkLoading: false
					}).apply(compiler);
					break;
				}
				case "async-node": {
					const CommonJsChunkLoadingPlugin = require("../node/CommonJsChunkLoadingPlugin");
					new CommonJsChunkLoadingPlugin({
						asyncChunkLoading: true
					}).apply(compiler);
					break;
				}
				case "import":
					// TODO implement import chunk loading
					throw new Error("Chunk Loading via import() is not implemented yet");
				case "universal":
					// TODO implement universal chunk loading
					throw new Error("Universal Chunk Loading is not implemented yet");
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

module.exports = EnableChunkLoadingPlugin;
