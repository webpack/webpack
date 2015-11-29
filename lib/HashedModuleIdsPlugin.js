/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function HashedModuleIdsPlugin(options) {
	this.options = options || {};
	this.options.hashFunction = this.options.hashFunction || "md5";
	this.options.hashDigest = this.options.hashDigest || "base64";
	this.options.hashDigestLength = this.options.hashDigestLength || 4;
}
module.exports = HashedModuleIdsPlugin;
HashedModuleIdsPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		var usedIds = {};
		compilation.plugin("before-module-ids", function(modules) {
			modules.forEach(function(module) {
				if(module.id === null && module.libIdent) {
					var id = module.libIdent({
						context: this.options.context || compiler.options.context
					});
					var hash = require("crypto").createHash(options.hashFunction);
					hash.update(id);
					id = hash.digest(options.hashDigest);
					var len = options.hashDigestLength;
					while(usedIds[id.substr(0, len)])
						len++;
					module.id = id.substr(0, len);
					usedIds[module.id] = true;
				}
			}, this);
		}.bind(this));
	}.bind(this));
};
