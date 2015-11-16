/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SingleEntryPlugin = require("./SingleEntryPlugin");
var MultiEntryPlugin = require("./MultiEntryPlugin");

function EntryOptionPlugin() {}
module.exports = EntryOptionPlugin;

EntryOptionPlugin.prototype.apply = function(compiler) {
	compiler.plugin("entry-option", function(context, entry) {
		function itemToPlugin(item, name) {
			if(Array.isArray(item))
				return new MultiEntryPlugin(context, item, name);
			else
				return new SingleEntryPlugin(context, item, name);
		}
		if(typeof entry === "string" || Array.isArray(entry)) {
			compiler.apply(itemToPlugin(entry, "main"));
		} else if(typeof entry === "object") {
			Object.keys(entry).forEach(function(name) {
				compiler.apply(itemToPlugin(entry[name], name));
			});
		}
		return true;
	});
};
