/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

function CachePlugin(cache) {
	this.cache = cache || {};
}
module.exports = CachePlugin;

CachePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.cache = this.cache;
	}.bind(this));
	compiler.plugin("run", function(compiler, callback) {
		if(!compiler._lastCompilationFileDependencies) return callback();
		var fs = compiler.inputFileSystem;
		fileTs = compiler.fileTimestamps = {};
		async.forEach(compiler._lastCompilationFileDependencies, function(file, callback) {
			fs.stat(file, function(err, stat) {
				if(err) return callback(err);
				
				fileTs[file] = stat.mtime || Infinity;
				callback();
			});
		}, callback);
	}.bind(this));
	compiler.plugin("after-compile", function(compilation, callback) {
		compilation.compiler._lastCompilationFileDependencies = compilation.fileDependencies;
		compilation.compiler._lastCompilationContextDependencies = compilation.contextDependencies;
		callback();
	}.bind(this));
};