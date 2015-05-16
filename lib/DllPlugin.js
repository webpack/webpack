/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DllEntryPlugin = require("./DllEntryPlugin");
var LibManifestPlugin = require("./LibManifestPlugin");

function DllPlugin(options) {
	this.options = options;
}
module.exports = DllPlugin;
DllPlugin.prototype.apply = function(compiler) {
	compiler.plugin("entry-option", function(context, entry) {
		function itemToPlugin(item, name) {
			if(Array.isArray(item))
				return new DllEntryPlugin(context, item, name);
			else
				throw new Error("DllPlugin: supply an Array as entry");
		}
		if(typeof entry === "object") {
			Object.keys(entry).forEach(function(name) {
				compiler.apply(itemToPlugin(entry[name], name));
			});
		} else {
			compiler.apply(itemToPlugin(entry, "main"));
		}
		return true;
	});
	compiler.apply(new LibManifestPlugin(this.options));
};
