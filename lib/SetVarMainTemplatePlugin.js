/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function SetVarMainTemplatePlugin(varExpression, copyObject) {
	this.varExpression = varExpression;
	this.copyObject = copyObject;
}
module.exports = SetVarMainTemplatePlugin;
SetVarMainTemplatePlugin.prototype.apply = function(mainTemplate) {
	mainTemplate.plugin("render", function(source, chunk, hash) {
		var varExpression = this.varExpression
			.replace(Template.REGEXP_HASH, hash)
			.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
			.replace(Template.REGEXP_ID, chunk.id)
			.replace(Template.REGEXP_NAME, chunk.name || chunk.id);
		if(this.copyObject) {
			return new ConcatSource("(function(e, a) { for(var i in a) e[i] = a[i]; }(" +
				varExpression + ", ", source, "))");
		} else {
			var prefix = varExpression + " =\n";
			return new ConcatSource(prefix, source);
		}
	}.bind(this));
	mainTemplate.plugin("global-hash", function(chunk) {
		if(Template.REGEXP_HASH.test(this.varExpression || ""))
			return true;
	}.bind(this));
	mainTemplate.plugin("hash", function(hash) {
		hash.update("set var");
		hash.update(this.varExpression + "");
		hash.update(this.copyObject + "");
	}.bind(this));
};