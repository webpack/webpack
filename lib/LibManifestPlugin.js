/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var async = require("async");
var HarmonyModulesHelpers = require("./dependencies/HarmonyModulesHelpers");

function LibManifestPlugin(options) {
	this.options = options;
}
module.exports = LibManifestPlugin;
LibManifestPlugin.prototype.apply = function(compiler) {
	compiler.plugin("emit", function(compilation, callback) {
		async.forEach(compilation.chunks, function(chunk, callback) {
			if(!chunk.isInitial()) {
				callback();
				return;
			}
			var targetPath = compilation.getPath(this.options.path, {
				hash: compilation.hash,
				chunk: chunk
			});
			var name = this.options.name && compilation.getPath(this.options.name, {
				hash: compilation.hash,
				chunk: chunk
			});
			var manifest = {
				name: name,
				type: this.options.type,
				content: chunk.modules.reduce(function(obj, module) {
					if(module.libIdent) {
						var ident = module.libIdent({
							context: this.options.context || compiler.options.context
						});
						if(ident) {
							obj[ident] = {
								id: module.id,
								meta: module.meta,
								hasStarExport: HarmonyModulesHelpers.hasStarExport(module),
								activeExports: HarmonyModulesHelpers.getActiveExports(module)
							};
						}
					}
					return obj;
				}.bind(this), {})
			};
			var content = new Buffer(JSON.stringify(manifest, null, 2), "utf-8");
			compiler.outputFileSystem.mkdirp(path.dirname(targetPath), function(err) {
				if(err) return callback(err);
				compiler.outputFileSystem.writeFile(targetPath, content, callback);
			});
		}.bind(this), callback);
	}.bind(this));
};
