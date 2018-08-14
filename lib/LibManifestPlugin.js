/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const path = require("path");
const SingleEntryDependency = require("./dependencies/SingleEntryDependency");
const { compareModulesById } = require("./util/comparators");

class LibManifestPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.hooks.emit.tapAsync(
			"LibManifestPlugin",
			(compilation, callback) => {
				asyncLib.forEach(
					compilation.chunks,
					(chunk, callback) => {
						if (!chunk.isOnlyInitial()) {
							callback();
							return;
						}
						const chunkGraph = compilation.chunkGraph;
						const targetPath = compilation.getPath(this.options.path, {
							hash: compilation.hash,
							chunk
						});
						const name =
							this.options.name &&
							compilation.getPath(this.options.name, {
								hash: compilation.hash,
								chunk
							});
						const manifest = {
							name,
							type: this.options.type,
							content: Array.from(
								chunkGraph.getOrderedChunkModulesIterable(
									chunk,
									compareModulesById
								),
								module => {
									if (
										this.options.entryOnly &&
										!compilation.moduleGraph
											.getIncomingConnections(module)
											.some(c => c.dependency instanceof SingleEntryDependency)
									) {
										return;
									}
									const ident = module.libIdent({
										context: this.options.context || compiler.options.context
									});
									if (ident) {
										return {
											ident,
											data: {
												id: module.id,
												buildMeta: module.buildMeta
											}
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
						const content = Buffer.from(JSON.stringify(manifest), "utf8");
						compiler.outputFileSystem.mkdirp(path.dirname(targetPath), err => {
							if (err) return callback(err);
							compiler.outputFileSystem.writeFile(
								targetPath,
								content,
								callback
							);
						});
					},
					callback
				);
			}
		);
	}
}
module.exports = LibManifestPlugin;
