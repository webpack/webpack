/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");

/** @typedef {import("../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../declarations/WebpackOptions").EntryNormalized} Entry */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

/**
 * @typedef {object} EntryOptionPluginHooks
 * @property {SyncBailHook<[string, string, EntryDescription], string | undefined>} entry transform an entry into a different request (e.g. wrap a non-HTML entry in a synthetic HTML module); return `undefined` to keep the default behavior
 */

const PLUGIN_NAME = "EntryOptionPlugin";

/** @type {WeakMap<Compiler, EntryOptionPluginHooks>} */
const hooksMap = new WeakMap();

class EntryOptionPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {EntryOptionPluginHooks} the hooks
	 */
	static getHooks(compiler) {
		let hooks = hooksMap.get(compiler);
		if (hooks === undefined) {
			hooks = {
				entry: new SyncBailHook(["context", "name", "entryDescription"])
			};
			hooksMap.set(compiler, hooks);
		}
		return hooks;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance one is tapping into
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.entryOption.tap(PLUGIN_NAME, (context, entry) => {
			EntryOptionPlugin.applyEntryOption(compiler, context, entry);
			return true;
		});
	}

	/**
	 * Apply entry option.
	 * @param {Compiler} compiler the compiler
	 * @param {string} context context directory
	 * @param {Entry} entry request
	 * @returns {void}
	 */
	static applyEntryOption(compiler, context, entry) {
		if (typeof entry === "function") {
			const DynamicEntryPlugin = require("./DynamicEntryPlugin");

			new DynamicEntryPlugin(context, entry).apply(compiler);
		} else {
			const EntryPlugin = require("./EntryPlugin");

			for (const name of Object.keys(entry)) {
				const desc = entry[name];
				const options = EntryOptionPlugin.entryDescriptionToOptions(
					compiler,
					name,
					desc
				);
				const descImport =
					/** @type {Exclude<EntryDescription["import"], undefined>} */
					(desc.import);
				// A plugin (e.g. HtmlModulesPlugin) may rewrite the entry into a
				// single synthetic request; otherwise each import becomes an entry.
				const request = EntryOptionPlugin.getHooks(compiler).entry.call(
					context,
					name,
					desc
				);
				if (request !== undefined) {
					new EntryPlugin(context, request, options).apply(compiler);
				} else {
					for (const entry of descImport) {
						new EntryPlugin(context, entry, options).apply(compiler);
					}
				}
			}
		}
	}

	/**
	 * Entry description to options.
	 * @param {Compiler} compiler the compiler
	 * @param {string} name entry name
	 * @param {EntryDescription} desc entry description
	 * @returns {EntryOptions} options for the entry
	 */
	static entryDescriptionToOptions(compiler, name, desc) {
		/** @type {EntryOptions} */
		const options = {
			name,
			filename: desc.filename,
			runtime: desc.runtime,
			layer: desc.layer,
			dependOn: desc.dependOn,
			baseUri: desc.baseUri,
			publicPath: desc.publicPath,
			chunkLoading: desc.chunkLoading,
			asyncChunks: desc.asyncChunks,
			wasmLoading: desc.wasmLoading,
			worker: desc.worker,
			library: desc.library
		};
		if (desc.chunkLoading) {
			const EnableChunkLoadingPlugin = require("./javascript/EnableChunkLoadingPlugin");

			EnableChunkLoadingPlugin.checkEnabled(compiler, desc.chunkLoading);
		}
		if (desc.wasmLoading) {
			const EnableWasmLoadingPlugin = require("./wasm/EnableWasmLoadingPlugin");

			EnableWasmLoadingPlugin.checkEnabled(compiler, desc.wasmLoading);
		}
		if (desc.library) {
			const EnableLibraryPlugin = require("./library/EnableLibraryPlugin");

			EnableLibraryPlugin.checkEnabled(compiler, desc.library.type);
		}
		return options;
	}
}

module.exports = EntryOptionPlugin;
