/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;

function SetVarMainTemplatePlugin(varExpressions, copyObject) {
	if (varExpressions && varExpressions.constructor !== Array) {
		varExpressions = [varExpressions];
	}
	this.varExpressions = varExpressions.length > 0 ? varExpressions : undefined;
	this.copyObject = copyObject;
}
module.exports = SetVarMainTemplatePlugin;
SetVarMainTemplatePlugin.prototype.apply = function(compilation) {
	var mainTemplate = compilation.mainTemplate;
	compilation.templatesPlugin("render-with-entry", function(source, chunk, hash) {
		var varExpressionsSrc = this.varExpressions.map(function(varExpressionSrc) {
			return mainTemplate.applyPluginsWaterfall("asset-path", varExpressionSrc, {
				hash: hash,
				chunk: chunk
			});
		});
		if(this.copyObject) {
			return new ConcatSource("(function(e, a) { for(var i in a) " +
					"for(var j=0; j<e.length; j++) e[j][i] = a[i];" +
				"}(" +
				JSON.stringify(varExpressionsSrc) + ",\n", source, "\n))");
		} else {
			var prefix = varExpressionsSrc.map(function(varExpression) {
				return varExpression + " ="
			}).join(" ")+"\n";
			return new ConcatSource(prefix, source);
		}
	}.bind(this));
	mainTemplate.plugin("global-hash-paths", function(paths) {
		if(this.varExpressions) paths = paths.concat(this.varExpressions);
		return paths;
	});
	mainTemplate.plugin("hash", function(hash) {
		hash.update("set var");
		if (this.varExpressions) {
			this.varExpressions.forEach(function(varExpression) {
				hash.update(varExpression + "");
			});
		}
		hash.update(this.copyObject + "");
	}.bind(this));
};
