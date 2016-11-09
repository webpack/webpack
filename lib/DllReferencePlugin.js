/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DelegatedPlugin = require("./DelegatedPlugin");
var ExternalsPlugin = require("./ExternalsPlugin");

function DllReferencePlugin(options) {
	this.options = options;
}
module.exports = DllReferencePlugin;
DllReferencePlugin.prototype.apply = function(compiler) {
	var name = this.options.name || this.options.manifest.name;
	var sourceType = this.options.sourceType || "var";
	var externals = {};
	var source = "dll-reference " + name;
	externals[source] = name;
	compiler.apply(new ExternalsPlugin(sourceType, externals));
	compiler.apply(new DelegatedPlugin({
		source: source,
		type: this.options.type,
		scope: this.options.scope,
		context: this.options.context,
		content: this.options.content || this.options.manifest.content
	}));
};
