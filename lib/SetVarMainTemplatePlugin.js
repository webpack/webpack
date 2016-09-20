/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;

function SetVarMainTemplatePlugin(varExpressions, copyObject, defineVars) {
	if (!Array.isArray(varExpressions)) {
		varExpressions = [varExpressions];
	}
	this.varExpressions = varExpressions.length > 0 ? varExpressions : undefined;
	if (copyObject && defineVars) {
		throw new Error("defineVars invalid with copyObject option.");
	}
	this.copyObject = copyObject;
	this.defineVars = !!defineVars;
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
			if (varExpressionsSrc.length === 1) {
				return new ConcatSource("(function(e, a) { for(var i in a) e[i] = a[i]; }(" +
					varExpressionsSrc[0] + ",\n", source, "\n))");
			}
			return new ConcatSource("(function(e, a) { for(var i in a) " +
					"for(var j = 0; j < e.length; j++) e[j][i] = a[i];" +
				"}(" +
				JSON.stringify(varExpressionsSrc) + ",\n", source, "\n))");
		} else {
			var prefix = "";
			if (varExpressionsSrc.length === 1) {
				prefix = "var " + varExpressionsSrc[0] + " =\n";
			}
			else {
				if (this.defineVars) {
					prefix += "var " + varExpressionsSrc.join(", ")+";\n";
				}
				prefix += varExpressionsSrc.map(function(varExpression) {
					return varExpression + " ="
				}).join(" ")+"\n";
			}
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
