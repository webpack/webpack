/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NodeMainTemplatePlugin = require("./NodeMainTemplatePlugin");
var NodeChunkTemplate = require("./NodeChunkTemplate");
var NodeHotUpdateChunkTemplate = require("./NodeHotUpdateChunkTemplate");

function NodeTemplatePlugin(options, asyncChunkLoading) {
	this.options = options;
	this.asyncChunkLoading = asyncChunkLoading;
}
module.exports = NodeTemplatePlugin;
NodeTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.mainTemplate.apply(new NodeMainTemplatePlugin(this.asyncChunkLoading));
	}.bind(this));
	compiler.chunkTemplate = new NodeChunkTemplate(options);
	compiler.hotUpdateChunkTemplate = new NodeHotUpdateChunkTemplate(options);
};
