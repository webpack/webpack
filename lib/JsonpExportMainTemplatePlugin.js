/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function JsonpExportMainTemplatePlugin(name) {
	this.name = name;
}
module.exports = JsonpExportMainTemplatePlugin;
JsonpExportMainTemplatePlugin.prototype.apply = function(mainTemplate) {
	mainTemplate.plugin("render", function(source, chunk, hash) {
		var name = (this.name || "")
			.replace(Template.REGEXP_HASH, hash)
			.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
			.replace(Template.REGEXP_ID, chunk.id)
			.replace(Template.REGEXP_NAME, chunk.name || "");
		return new ConcatSource(name + "(", source, ");");
	}.bind(this));
	mainTemplate.plugin("global-hash", function(chunk) {
		if(Template.REGEXP_HASH.test(this.name || ""))
			return true;
	}.bind(this));
	mainTemplate.plugin("hash", function(hash) {
		hash.update("jsonp export");
		hash.update(this.name + "");
	}.bind(this));
};