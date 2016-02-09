/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

function CachePlugin(cache) {
	this.cache = cache || {};
	this.FS_ACCURENCY = 10000;
}
module.exports = CachePlugin;

CachePlugin.prototype.apply = function(compiler) {
	if(Array.isArray(compiler.compilers)) {
		compiler.compilers.forEach(function(c, idx) {
			c.apply(new CachePlugin(this.cache[idx] = this.cache[idx] || {}));
		}, this);
	} else {
		var _this = this;
		compiler.plugin("compilation", function(compilation) {
			if(compilation.notCacheable) {
				compilation.warnings.push(new Error("CachePlugin - Cache cannot be used because of: " + compilation.notCacheable))
			} else {
				compilation.cache = _this.cache;
			}
		});
		compiler.plugin("run", function(compiler, callback) {
			if(!compiler._lastCompilationFileDependencies) return callback();
			var fs = compiler.inputFileSystem;
			var fileTs = compiler.fileTimestamps = {};
			async.forEach(compiler._lastCompilationFileDependencies, function(file, callback) {
				fs.stat(file, function(err, stat) {
					if(err) {
						if(err.code === "ENOENT") return callback();
						return callback(err);
					}

					if(stat.mtime)
						_this.applyMtime(+stat.mtime);

					fileTs[file] = stat.mtime || Infinity;
					callback();
				});
			}, callback);
			Object.keys(fileTs).forEach(function(key) {
				fileTs[key] += _this.FS_ACCURENCY;
			});
		});
		compiler.plugin("after-compile", function(compilation, callback) {
			compilation.compiler._lastCompilationFileDependencies = compilation.fileDependencies;
			compilation.compiler._lastCompilationContextDependencies = compilation.contextDependencies;
			callback();
		});
	}
};

CachePlugin.prototype.applyMtime = function applyMtime(mtime) {
	if(this.FS_ACCURENCY > 1 && mtime % 1 !== 0)
		this.FS_ACCURENCY = 1;
	else if(this.FS_ACCURENCY > 10 && mtime % 10 !== 0)
		this.FS_ACCURENCY = 10;
	else if(this.FS_ACCURENCY > 100 && mtime % 100 !== 0)
		this.FS_ACCURENCY = 100;
	else if(this.FS_ACCURENCY > 1000 && mtime % 1000 !== 0)
		this.FS_ACCURENCY = 1000;
	else if(this.FS_ACCURENCY > 2000 && mtime % 2000 !== 0)
		this.FS_ACCURENCY = 2000;
};
