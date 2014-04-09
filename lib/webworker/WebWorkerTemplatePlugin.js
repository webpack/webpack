/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var WebWorkerMainTemplate = require("./WebWorkerMainTemplate");
var WebWorkerChunkTemplate = require("./WebWorkerChunkTemplate");

function WebWorkerTemplatePlugin(options) {
	this.options = options;
}
module.exports = WebWorkerTemplatePlugin;
WebWorkerTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.mainTemplate = new WebWorkerMainTemplate(options);
	compiler.chunkTemplate = new WebWorkerChunkTemplate(options);
};