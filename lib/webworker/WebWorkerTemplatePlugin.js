/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var WebWorkerMainTemplatePlugin = require("./WebWorkerMainTemplatePlugin");
var WebWorkerChunkTemplate = require("./WebWorkerChunkTemplate");

function WebWorkerTemplatePlugin(options) {
	this.options = options;
}
module.exports = WebWorkerTemplatePlugin;
WebWorkerTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.mainTemplate.apply(new WebWorkerMainTemplatePlugin());
	});
	compiler.chunkTemplate = new WebWorkerChunkTemplate(options);
};