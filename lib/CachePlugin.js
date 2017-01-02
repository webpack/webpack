/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const async = require("async");

class CachePlugin {
	constructor(cache) {
		this.cache = cache || {};
		this.FS_ACCURENCY = 2000;
	}

	apply(compiler) {
		if(Array.isArray(compiler.compilers)) {
			compiler.compilers.forEach((c, idx) => {
				c.apply(new CachePlugin(this.cache[idx] = this.cache[idx] || {}));
			});
		} else {
			compiler.plugin("compilation", compilation => {
				if(!compilation.notCacheable) {
					compilation.cache = this.cache;
				} else if(this.watching) {
					compilation.warnings.push(
						new Error(`CachePlugin - Cache cannot be used because of: ${compilation.notCacheable}`)
					);
				}
			});
			compiler.plugin("watch-run", (compiler, callback) => {
				this.watching = true;
				callback();
			});
			compiler.plugin("run", (compiler, callback) => {
				if(!compiler._lastCompilationFileDependencies) return callback();
				const fs = compiler.inputFileSystem;
				const fileTs = compiler.fileTimestamps = {};
				async.forEach(compiler._lastCompilationFileDependencies, (file, callback) => {
					fs.stat(file, (err, stat) => {
						if(err) {
							if(err.code === "ENOENT") return callback();
							return callback(err);
						}

						if(stat.mtime)
							this.applyMtime(+stat.mtime);

						fileTs[file] = +stat.mtime || Infinity;
						callback();
					});
				}, err => {
					if(err) return callback(err);
					Object.keys(fileTs).forEach(key => {
						fileTs[key] += this.FS_ACCURENCY;
					});
					callback();
				});
			});
			compiler.plugin("after-compile", function(compilation, callback) {
				compilation.compiler._lastCompilationFileDependencies = compilation.fileDependencies;
				compilation.compiler._lastCompilationContextDependencies = compilation.contextDependencies;
				callback();
			});
		}
	}

	/* istanbul ignore next */
	applyMtime(mtime) {
		if(this.FS_ACCURENCY > 1 && mtime % 2 !== 0)
			this.FS_ACCURENCY = 1;
		else if(this.FS_ACCURENCY > 10 && mtime % 20 !== 0)
			this.FS_ACCURENCY = 10;
		else if(this.FS_ACCURENCY > 100 && mtime % 200 !== 0)
			this.FS_ACCURENCY = 100;
		else if(this.FS_ACCURENCY > 1000 && mtime % 2000 !== 0)
			this.FS_ACCURENCY = 1000;
	}
}
module.exports = CachePlugin;
