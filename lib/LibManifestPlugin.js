/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const EntryDependency = require("./dependencies/EntryDependency");
const { someInIterable } = require("./util/IterableHelpers");
const { compareModulesById } = require("./util/comparators");
const { dirname, mkdirp } = require("./util/fs");

/** @typedef {import("./Compiler")} Compiler */

/**
 * @typedef {Object} ManifestModuleData
 * @property {string | number} id
 * @property {Object} buildMeta
 * @property {boolean | string[]} exports
 */

class LibManifestPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.emit.tapAsync(
			"LibManifestPlugin",
			(compilation, callback) => {
				const moduleGraph = compilation.moduleGraph;
				asyncLib.forEach(
					Array.from(compilation.chunks),
					(chunk, callback) => {
						if (!chunk.canBeInitial()) {
							callback();
							return;
						}
						const chunkGraph = compilation.chunkGraph;
						const targetPath = compilation.getPath(this.options.path, {
							chunk
						});
						const name =
							this.options.name &&
							compilation.getPath(this.options.name, {
								chunk
							});
						const content = Object.create(null);
						for (const module of chunkGraph.getOrderedChunkModulesIterable(
							chunk,
							compareModulesById(chunkGraph)
						)) {
							if (
								this.options.entryOnly &&
								!someInIterable(
									moduleGraph.getIncomingConnections(module),
									c => c.dependency instanceof EntryDependency
								)
							) {
								continue;
							}
							const ident = module.libIdent({
								context: this.options.context || compiler.options.context,
								associatedObjectForCache: compiler.root
							});
							if (ident) {
								const exportsInfo = moduleGraph.getExportsInfo(module);
								const providedExports = exportsInfo.getProvidedExports();
								/** @type {ManifestModuleData} */
								const data = {
									id: chunkGraph.getModuleId(module),
									buildMeta: module.buildMeta,
									exports: Array.isArray(providedExports)
										? providedExports
										: undefined
								};
								content[ident] = data;
							}
						}
						const manifest = {
							name,
							type: this.options.type,
							content
						};
						// Apply formatting to content if format flag is true;
						const manifestContent = this.options.format
							? JSON.stringify(manifest, null, 2)
							: JSON.stringify(manifest);
						const buffer = Buffer.from(manifestContent, "utf8");
						mkdirp(
							compiler.intermediateFileSystem,
							dirname(compiler.intermediateFileSystem, targetPath),
							err => {
								if (err) return callback(err);
								compiler.intermediateFileSystem.writeFile(
									targetPath,
									buffer,
									callback
								);
							}
						);
					},
					callback
				);
			}
		);
	}
}
module.exports = LibManifestPlugin;
