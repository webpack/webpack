"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
class SourceMapDevToolModuleOptionsPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compilation) {
		if(this.options.module !== false) {
			compilation.plugin("build-module", function(module) {
				module.useSourceMap = true;
			});
		}
		if(this.options.lineToLine === true) {
			compilation.plugin("build-module", function(module) {
				module.lineToLine = true;
			});
		} else if(this.options.lineToLine) {
			compilation.plugin("build-module", (module) => {
				if(!module.resource) {
					return;
				}
				let resourcePath = module.resource;
				const idx = resourcePath.indexOf("?");
				if(idx >= 0) {
					resourcePath = resourcePath.substr(0, idx);
				}
				module.lineToLine = ModuleFilenameHelpers.matchObject(this.options.lineToLine, resourcePath);
			});
		}
	}
}
module.exports = SourceMapDevToolModuleOptionsPlugin;
