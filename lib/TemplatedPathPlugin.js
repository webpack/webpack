/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

var templatedPathHelper = require('./TemplatedPathHelper');

function TemplatedPathPlugin() {}

module.exports = TemplatedPathPlugin;

TemplatedPathPlugin.prototype.constructor = TemplatedPathPlugin;
TemplatedPathPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		var mainTemplate = compilation.mainTemplate;

		mainTemplate.plugin("asset-path", templatedPathHelper.replacePathVariables);

		mainTemplate.plugin("global-hash", function(chunk, paths) {
			var outputOptions = this.outputOptions;
			var publicPath = outputOptions.publicPath || "";
			var filename = outputOptions.filename || "";
			var chunkFilename = outputOptions.chunkFilename || outputOptions.filename;
			if(templatedPathHelper.REGEXP_HASH_FOR_TEST.test(publicPath) || templatedPathHelper.REGEXP_CHUNKHASH_FOR_TEST.test(publicPath) || templatedPathHelper.REGEXP_NAME_FOR_TEST.test(publicPath))
				return true;
			if(templatedPathHelper.REGEXP_HASH_FOR_TEST.test(filename))
				return true;
			if(templatedPathHelper.REGEXP_HASH_FOR_TEST.test(chunkFilename))
				return true;
			if(templatedPathHelper.REGEXP_HASH_FOR_TEST.test(paths.join("|")))
				return true;
		});

		mainTemplate.plugin("hash-for-chunk", function(hash, chunk) {
			var outputOptions = this.outputOptions;
			var chunkFilename = outputOptions.chunkFilename || outputOptions.filename;
			if(templatedPathHelper.REGEXP_CHUNKHASH_FOR_TEST.test(chunkFilename))
				hash.update(JSON.stringify(chunk.getChunkMaps(true, true).hash));
			if(templatedPathHelper.REGEXP_NAME_FOR_TEST.test(chunkFilename))
				hash.update(JSON.stringify(chunk.getChunkMaps(true, true).name));
		});
	});
};
