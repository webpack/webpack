/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;

function CommonJsHarmonyMainTemplatePlugin() {}

module.exports = CommonJsHarmonyMainTemplatePlugin;

CommonJsHarmonyMainTemplatePlugin.prototype.apply = function(compilation) {
	var mainTemplate = compilation.mainTemplate;
	compilation.templatesPlugin("render-with-entry", function(source, chunk, hash) {
		var prefix = "module.exports =\n";
		var postfix = "\nObject.defineProperty(module.exports, \"__esModule\", { value: true });";
		return new ConcatSource(prefix, source, postfix);
	});
	mainTemplate.plugin("hash", function(hash) {
		hash.update("commonjs harmony");
	});
};
