/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");

function SetVarMainTemplatePlugin(varExpression, copyObject) {
	this.varExpression = varExpression;
	this.copyObject = copyObject;
}
module.exports = SetVarMainTemplatePlugin;
SetVarMainTemplatePlugin.prototype.apply = function(compilation) {
	var mainTemplate = compilation.mainTemplate;
	compilation.templatesPlugin("render-with-entry", function(source, chunk, hash) {
		var varExpression = mainTemplate.applyPluginsWaterfall("asset-path", this.varExpression, {
			hash: hash,
			chunk: chunk
		});
		if(this.copyObject) {
			return new ConcatSource("(function(e, a) { for(var i in a) e[i] = a[i]; }(" +
				varExpression + ", ", source, "))");
		} else {
			var prefix = varExpression + " =\n";
			return new ConcatSource(prefix, source);
		}
	}.bind(this));
	mainTemplate.plugin("global-hash-paths", function(paths) {
		if(this.varExpression) paths.push(this.varExpression);
		return paths;
	});
	mainTemplate.plugin("hash", function(hash) {
		hash.update("set var");
		hash.update(this.varExpression + "");
		hash.update(this.copyObject + "");
	}.bind(this));
};
