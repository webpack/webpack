/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NodeMainTemplate = require("./NodeMainTemplate");
var NodeChunkTemplate = require("./NodeChunkTemplate");
var NodeHotUpdateChunkTemplate = require("./NodeHotUpdateChunkTemplate");

function NodeTemplatePlugin(options, asyncChunkLoading) {
	this.options = options;
	this.asyncChunkLoading = asyncChunkLoading;
}
module.exports = NodeTemplatePlugin;
NodeTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.mainTemplate = new NodeMainTemplate(options, this.asyncChunkLoading);
	compiler.chunkTemplate = new NodeChunkTemplate(options);
	compiler.hotUpdateChunkTemplate = new NodeHotUpdateChunkTemplate(options);
};
