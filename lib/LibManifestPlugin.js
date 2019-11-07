/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const EntryDependency = require("./dependencies/EntryDependency");
const { compareModulesById } = require("./util/comparators");
const { dirname, mkdirp } = require("./util/fs");

/** @typedef {import("./Compiler")} Compiler */

/**
 * @typedef {Object} ManifestModuleData
 * @property {string | number} id
 * @property {Object} buildMeta
 * @property {boolean | string[]} exports
 */

/**
 * @template T
 * @param {Iterable<T>} iterable iterable
 * @param {function(T): boolean} filter predicate
 * @returns {boolean} true, if some items match the filter predicate
 */
const someInIterable = (iterable, filter) => {
	for (const item of iterable) {
		if (filter(item)) return true;
	}
	return false;
};

class LibManifestPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
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
						if (!chunk.isOnlyInitial()) {
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
						const manifest = {
							name,
							type: this.options.type,
							content: Array.from(
								chunkGraph.getOrderedChunkModulesIterable(
									chunk,
									compareModulesById(chunkGraph)
								),
								module => {
									if (
										this.options.entryOnly &&
										!someInIterable(
											moduleGraph.getIncomingConnections(module),
											c => c.dependency instanceof EntryDependency
										)
									) {
										return;
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
										return {
											ident,
											data
										};
									}
								}
							)
								.filter(Boolean)
								.reduce((obj, item) => {
									obj[item.ident] = item.data;
									return obj;
								}, Object.create(null))
						};
						// Apply formatting to content if format flag is true;
						const manifestContent = this.options.format
							? JSON.stringify(manifest, null, 2)
							: JSON.stringify(manifest);
						const content = Buffer.from(manifestContent, "utf8");
						mkdirp(
							compiler.intermediateFileSystem,
							dirname(compiler.intermediateFileSystem, targetPath),
							err => {
								if (err) return callback(err);
								compiler.intermediateFileSystem.writeFile(
									targetPath,
									content,
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
