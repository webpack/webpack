/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const asyncLib = require("async");

class LibManifestPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("emit", (compilation, callback) => {
			asyncLib.forEach(compilation.chunks, (chunk, callback) => {
				if(!chunk.isInitial()) {
					callback();
					return;
				}
				const targetPath = compilation.getPath(this.options.path, {
					hash: compilation.hash,
					chunk
				});
				const name = this.options.name && compilation.getPath(this.options.name, {
					hash: compilation.hash,
					chunk
				});
				const manifest = {
					name,
					type: this.options.type,
					content: chunk.modules.reduce((obj, module) => {
						if(module.libIdent) {
							const ident = module.libIdent({
								context: this.options.context || compiler.options.context
							});
							if(ident) {
								obj[ident] = {
									id: module.id,
									meta: module.meta,
									exports: Array.isArray(module.providedExports) ? module.providedExports : undefined
								};
							}
						}
						return obj;
					}, {})
				};
				const content = new Buffer(JSON.stringify(manifest, null, 2), "utf8"); //eslint-disable-line
				compiler.outputFileSystem.mkdirp(path.dirname(targetPath), err => {
					if(err) return callback(err);
					compiler.outputFileSystem.writeFile(targetPath, content, callback);
				});
			}, callback);
		});
	}
}
module.exports = LibManifestPlugin;
