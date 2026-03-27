/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../declarations/WebpackOptions").EntryNormalized} Entry */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

const PLUGIN_NAME = "EntryOptionPlugin";

class EntryOptionPlugin {
	/**
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

			if (typeof entry !== "object" || entry === null) {
				throw new Error(
					"Invalid entry configuration. Entry should be an object, function, or valid configuration format. HTML files are not directly supported as entry points. Consider using html-webpack-plugin or preprocessing your HTML into a JavaScript entry."
				);
			}

			for (const name of Object.keys(entry)) {
				const desc = entry[name];
				if (!desc || !desc.import) {
					throw new Error(
						`Invalid entry description for '${name}'. Expected an object with an 'import' field.`
					);
				}
				const options = EntryOptionPlugin.entryDescriptionToOptions(
					compiler,
					name,
					desc
				);
				const descImport =
					/** @type {Exclude<EntryDescription["import"], undefined>} */
					(desc.import);
				for (const entry of descImport) {
					new EntryPlugin(context, entry, options).apply(compiler);
				}
			}
		}
	}

	/**
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
