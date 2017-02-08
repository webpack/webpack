/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RawSource = require("webpack-sources").RawSource;
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

class EvalDevToolModuleTemplatePlugin {
	constructor(sourceUrlComment, moduleFilenameTemplate) {
		this.sourceUrlComment = sourceUrlComment || "\n//# sourceURL=[url]";
		this.moduleFilenameTemplate = moduleFilenameTemplate || "webpack:///[resourcePath]?[loaders]";
	}

	apply(moduleTemplate) {
		moduleTemplate.plugin("module", (source, module) => {
			const content = source.source();
			const str = ModuleFilenameHelpers.createFilename(module, this.moduleFilenameTemplate, moduleTemplate.requestShortener);
			const footer = ["\n",
				ModuleFilenameHelpers.createFooter(module, moduleTemplate.requestShortener),
				this.sourceUrlComment.replace(/\[url\]/g, encodeURI(str).replace(/%2F/g, "/").replace(/%20/g, "_").replace(/%5E/g, "^").replace(/%5C/g, "\\").replace(/^\//, ""))
			].join("\n");
			return new RawSource(`eval(${JSON.stringify(content + footer)});`);
		});
		moduleTemplate.plugin("hash", hash => {
			hash.update("EvalDevToolModuleTemplatePlugin");
			hash.update("2");
		});
	}
}

module.exports = EvalDevToolModuleTemplatePlugin;
