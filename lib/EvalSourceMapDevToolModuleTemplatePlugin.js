/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RawSource = require("webpack-sources").RawSource;
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

class EvalSourceMapDevToolModuleTemplatePlugin {
	constructor(compilation, options) {
		this.compilation = compilation;
		this.sourceMapComment = options.append || "//# sourceURL=[module]\n//# sourceMappingURL=[url]";
		this.moduleFilenameTemplate = options.moduleFilenameTemplate || "webpack://[namespace]/[resource-path]?[hash]";
		this.namespace = options.namespace || "";
		this.options = options;
	}

	apply(moduleTemplate) {
		const self = this;
		const options = this.options;
		moduleTemplate.plugin("module", (source, module) => {
			if(source.__EvalSourceMapDevToolData)
				return source.__EvalSourceMapDevToolData;
			let sourceMap;
			let content;
			if(source.sourceAndMap) {
				const sourceAndMap = source.sourceAndMap(options);
				sourceMap = sourceAndMap.map;
				content = sourceAndMap.source;
			} else {
				sourceMap = source.map(options);
				content = source.source();
			}
			if(!sourceMap) {
				return source;
			}

			// Clone (flat) the sourcemap to ensure that the mutations below do not persist.
			sourceMap = Object.keys(sourceMap).reduce((obj, key) => {
				obj[key] = sourceMap[key];
				return obj;
			}, {});
			const modules = sourceMap.sources.map(source => {
				const module = self.compilation.findModule(source);
				return module || source;
			});
			let moduleFilenames = modules.map(module => {
				return ModuleFilenameHelpers.createFilename(module, {
					moduleFilenameTemplate: self.moduleFilenameTemplate,
					namespace: self.namespace
				}, moduleTemplate.runtimeTemplate.requestShortener);
			});
			moduleFilenames = ModuleFilenameHelpers.replaceDuplicates(moduleFilenames, (filename, i, n) => {
				for(let j = 0; j < n; j++)
					filename += "*";
				return filename;
			});
			sourceMap.sources = moduleFilenames;
			if(sourceMap.sourcesContent) {
				sourceMap.sourcesContent = sourceMap.sourcesContent.map((content, i) => {
					return typeof content === "string" ? `${content}\n\n\n${ModuleFilenameHelpers.createFooter(modules[i], moduleTemplate.runtimeTemplate.requestShortener)}` : null;
				});
			}
			sourceMap.sourceRoot = options.sourceRoot || "";
			sourceMap.file = `${module.id}.js`;

			const footer = self.sourceMapComment.replace(/\[url\]/g, `data:application/json;charset=utf-8;base64,${new Buffer(JSON.stringify(sourceMap), "utf8").toString("base64")}`) + //eslint-disable-line
				`\n//# sourceURL=webpack-internal:///${module.id}\n`; // workaround for chrome bug
			source.__EvalSourceMapDevToolData = new RawSource(`eval(${JSON.stringify(content + footer)});`);
			return source.__EvalSourceMapDevToolData;
		});
		moduleTemplate.plugin("hash", hash => {
			hash.update("eval-source-map");
			hash.update("2");
		});
	}
}
module.exports = EvalSourceMapDevToolModuleTemplatePlugin;
