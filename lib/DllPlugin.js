/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

const DllEntryPlugin = require("./DllEntryPlugin");
const LibManifestPlugin = require("./LibManifestPlugin");
const FlagInitialModulesAsUsedPlugin = require("./FlagInitialModulesAsUsedPlugin");

class DllPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("entry-option", (context, entry) => {
			function itemToPlugin(item, name) {
				if(Array.isArray(item))
					return new DllEntryPlugin(context, item, name);
				else
					throw new Error("DllPlugin: supply an Array as entry");
			}
			if(typeof entry === "object" && !Array.isArray(entry)) {
				Object.keys(entry).forEach(name => {
					compiler.apply(itemToPlugin(entry[name], name));
				});
			} else {
				compiler.apply(itemToPlugin(entry, "main"));
			}
			return true;
		});
		compiler.apply(new LibManifestPlugin(this.options));
		compiler.apply(new FlagInitialModulesAsUsedPlugin());
	}
}

module.exports = DllPlugin;
