/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").WasmLoadingType} WasmLoadingType */
/** @typedef {import("../Compiler")} Compiler */

/** @type {WeakMap<Compiler, Set<WasmLoadingType>>} */
const enabledTypes = new WeakMap();

const getEnabledTypes = compiler => {
	let set = enabledTypes.get(compiler);
	if (set === undefined) {
		set = new Set();
		enabledTypes.set(compiler, set);
	}
	return set;
};

class EnableWasmLoadingPlugin {
	/**
	 * @param {WasmLoadingType} type library type that should be available
	 */
	constructor(type) {
		this.type = type;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @param {WasmLoadingType} type type of library
	 * @returns {void}
	 */
	static setEnabled(compiler, type) {
		getEnabledTypes(compiler).add(type);
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @param {WasmLoadingType} type type of library
	 * @returns {void}
	 */
	static checkEnabled(compiler, type) {
		if (!getEnabledTypes(compiler).has(type)) {
			throw new Error(
				`Library type "${type}" is not enabled. ` +
					"EnableWasmLoadingPlugin need to be used to enable this type of wasm loading. " +
					'This usually happens through the "output.enabledWasmLoadingTypes" option. ' +
					'If you are using a function as entry which sets "wasmLoading", you need to add all potential library types to "output.enabledWasmLoadingTypes". ' +
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
				case "fetch": {
					// TODO webpack 6 remove FetchCompileWasmPlugin
					const FetchCompileWasmPlugin = require("../web/FetchCompileWasmPlugin");
					const FetchCompileAsyncWasmPlugin = require("../web/FetchCompileAsyncWasmPlugin");
					new FetchCompileWasmPlugin({
						mangleImports: compiler.options.optimization.mangleWasmImports
					}).apply(compiler);
					new FetchCompileAsyncWasmPlugin().apply(compiler);
					break;
				}
				case "async-node": {
					// TODO webpack 6 remove ReadFileCompileWasmPlugin
					const ReadFileCompileWasmPlugin = require("../node/ReadFileCompileWasmPlugin");
					const ReadFileCompileAsyncWasmPlugin = require("../node/ReadFileCompileAsyncWasmPlugin");
					new ReadFileCompileWasmPlugin({
						mangleImports: compiler.options.optimization.mangleWasmImports
					}).apply(compiler);
					new ReadFileCompileAsyncWasmPlugin().apply(compiler);
					break;
				}
				case "universal":
					throw new Error(
						"Universal WebAssembly Loading is not implemented yet"
					);
				default:
					throw new Error(`Unsupported wasm loading type ${type}.
Plugins which provide custom wasm loading types must call EnableWasmLoadingPlugin.setEnabled(compiler, type) to disable this error.`);
			}
		} else {
			// TODO support plugin instances here
			// apply them to the compiler
		}
	}
}

module.exports = EnableWasmLoadingPlugin;
