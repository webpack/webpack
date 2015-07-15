/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var WebWorkerMainTemplatePlugin = require("./WebWorkerMainTemplatePlugin");
var WebWorkerChunkTemplatePlugin = require("./WebWorkerChunkTemplatePlugin");

function WebWorkerTemplatePlugin() {}
module.exports = WebWorkerTemplatePlugin;
WebWorkerTemplatePlugin.prototype.apply = function(compiler) {
	compiler.plugin("this-compilation", function(compilation) {
		compilation.mainTemplate.apply(new WebWorkerMainTemplatePlugin());
		compilation.chunkTemplate.apply(new WebWorkerChunkTemplatePlugin());
	});
};
