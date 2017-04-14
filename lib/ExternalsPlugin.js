/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

var ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");

class ExternalsPlugin {
	constructor(type, externals) {
		this.type = type;
		this.externals = externals;
	}
	apply(compiler) {
		compiler.plugin("compile", (params) => {
			params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(this.type, this.externals));
		});
	}
}

module.exports = ExternalsPlugin;
