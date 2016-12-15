function FixModuleIdAndChunkIdPlugin() {}
module.exports = FixModuleIdAndChunkIdPlugin;
FixModuleIdAndChunkIdPlugin.prototype.apply = function(compiler) {
	var hashFunction = compiler.options.output.hashFunction;
	var hashDigest = compiler.options.output.hashDigest;
	var hashDigestLength = compiler.options.output.hashDigestLength;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("before-module-ids", function(modules) {
			modules.forEach(function(module) {
				if(module.id === null) {
					var hash = require("crypto").createHash(hashFunction);
					if(!module.resource) {
						return;
					}
					var nodeModulesPathIndex = module.resource.indexOf('node_modules');
					//hash is based on module's relative pathname, which is alway unique and fixed between different bundles
					if(nodeModulesPathIndex > 0) {
						hash.update(module.resource.substr(nodeModulesPathIndex));
					} else {
						hash.update(module.resource.replace(compiler.context, ''));
					}
					module.id = hash.digest(hashDigest).substr(0, hashDigestLength);
				}
			});
		});
		compilation.plugin("before-chunk-ids", function(chunks) {
			chunks.forEach(function(chunk) {
				if(chunk.id === null) {
					chunk.id = chunk.name;
				}
				if(!chunk.ids) {
					chunk.ids = [chunk.id];
				}
			});
		});
	});
};

module.exports = {
	plugins: [
		new FixModuleIdAndChunkIdPlugin()
	],

	node: {
		__dirname: false,
		__filename: false

	},

};
