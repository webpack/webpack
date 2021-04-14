/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").ChunkFormatType} ChunkFormatType */
/** @typedef {import("../Compiler")} Compiler */

/** @type {WeakMap<Compiler, Set<ChunkFormatType>>} */
const enabledTypes = new WeakMap();

const getEnabledTypes = compiler => {
	let set = enabledTypes.get(compiler);
	if (set === undefined) {
		set = new Set();
		enabledTypes.set(compiler, set);
	}
	return set;
};

class EnableChunkFormatPlugin {
	/**
	 * @param {ChunkFormatType} type library type that should be available
	 */
	constructor(type) {
		this.type = type;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @param {ChunkFormatType} type type of library
	 * @returns {void}
	 */
	static setEnabled(compiler, type) {
		getEnabledTypes(compiler).add(type);
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @param {ChunkFormatType} type type of library
	 * @returns {void}
	 */
	static checkEnabled(compiler, type) {
		if (!getEnabledTypes(compiler).has(type)) {
			throw new Error(
				`Chunk format type "${type}" is not enabled. ` +
					"EnableChunkFormatPlugin need to be used to enable this type of chunk format. " +
					'This usually happens through the "output.enabledChunkFormatTypes" option. ' +
					'If you are using a function as entry which sets "chunkFormat", you need to add all potential chunk format types to "output.enabledChunkFormatTypes". ' +
					"These types are enabled: " +
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

		switch (type) {
			case "array-push": {
				const ArrayPushCallbackChunkFormatPlugin = require("./ArrayPushCallbackChunkFormatPlugin");
				new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
				break;
			}
			case "commonjs": {
				const CommonJsChunkFormatPlugin = require("./CommonJsChunkFormatPlugin");
				new CommonJsChunkFormatPlugin().apply(compiler);
				break;
			}
			case "module":
				// TODO implement import chunk format
				throw new Error(
					"EcmaScript Module Chunk Format is not implemented yet"
				);
			case "universal":
				// TODO implement universal chunk loading
				throw new Error("Universal Chunk Format is not implemented yet");
			default:
				throw new Error(`Unsupported chunk format type ${type}.
Plugins which provide custom chunk format types must call EnableChunkFormatPlugin.setEnabled(compiler, type) to disable this error.`);
		}
	}
}

module.exports = EnableChunkFormatPlugin;
