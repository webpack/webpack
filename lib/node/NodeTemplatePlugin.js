/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NodeMainTemplate = require("./NodeMainTemplate");
var NodeChunkTemplate = require("./NodeChunkTemplate");

function NodeTemplatePlugin(options) {
	this.options = options;
}
module.exports = NodeTemplatePlugin;
NodeTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.mainTemplate = new NodeMainTemplate(options);
	compiler.chunkTemplate = new NodeChunkTemplate(options);
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("normal-module-loader", function(loaderContext) {
			loaderContext.target = "node";
		});
	});
};
