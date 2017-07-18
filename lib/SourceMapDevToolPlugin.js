/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const crypto = require("crypto");
const RequestShortener = require("./RequestShortener");
const ConcatSource = require("webpack-sources").ConcatSource;
const RawSource = require("webpack-sources").RawSource;
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

const basename = (name) => {
	if(name.indexOf("/") < 0) return name;
	return name.substr(name.lastIndexOf("/") + 1);
};

function getTaskForFile(file, chunk, options, compilation) {
	const asset = compilation.assets[file];
	if(asset.__SourceMapDevToolFile === file && asset.__SourceMapDevToolData) {
		const data = asset.__SourceMapDevToolData;
		for(const cachedFile in data) {
			compilation.assets[cachedFile] = data[cachedFile];
			if(cachedFile !== file)
				chunk.files.push(cachedFile);
		}
		return;
	}
	let source, sourceMap;
	if(asset.sourceAndMap) {
		const sourceAndMap = asset.sourceAndMap(options);
		sourceMap = sourceAndMap.map;
		source = sourceAndMap.source;
	} else {
		sourceMap = asset.map(options);
		source = asset.source();
	}
	if(sourceMap) {
		return {
			chunk,
			file,
			asset,
			source,
			sourceMap,
			modules: undefined
		};
	}
}

class SourceMapDevToolPlugin {
	constructor(options) {
		if(arguments.length > 1)
			throw new Error("SourceMapDevToolPlugin only takes one argument (pass an options object)");
		// TODO: remove in webpack 3
		if(typeof options === "string") {
			options = {
				sourceMapFilename: options
			};
		}
		if(!options) options = {};
		this.sourceMapFilename = options.filename;
		this.sourceMappingURLComment = options.append === false ? false : options.append || "\n//# sourceMappingURL=[url]";
		this.moduleFilenameTemplate = options.moduleFilenameTemplate || "webpack:///[resourcePath]";
		this.fallbackModuleFilenameTemplate = options.fallbackModuleFilenameTemplate || "webpack:///[resourcePath]?[hash]";
		this.options = options;
	}

	apply(compiler) {
		const sourceMapFilename = this.sourceMapFilename;
		const sourceMappingURLComment = this.sourceMappingURLComment;
		const moduleFilenameTemplate = this.moduleFilenameTemplate;
		const fallbackModuleFilenameTemplate = this.fallbackModuleFilenameTemplate;
		const requestShortener = new RequestShortener(compiler.context);
		const options = this.options;
		options.test = options.test || /\.(js|css)($|\?)/i;

		const matchObject = ModuleFilenameHelpers.matchObject.bind(undefined, options);

		compiler.plugin("compilation", compilation => {
			new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);

			compilation.plugin("after-optimize-chunk-assets", function(chunks) {
				const moduleToSourceNameMapping = new Map();
				const tasks = [];

				chunks.forEach(function(chunk) {
					chunk.files.forEach(file => {
						if(matchObject(file)) {
							const task = getTaskForFile(file, chunk, options, compilation);

							if(task) {
								const modules = task.sourceMap.sources.map(source => {
									const module = compilation.findModule(source);
									return module || source;
								});

								for(const module of modules) {
									if(!moduleToSourceNameMapping.get(module)) {
										moduleToSourceNameMapping.set(module, ModuleFilenameHelpers.createFilename(module, moduleFilenameTemplate, requestShortener));
									}
								}

								task.modules = modules;

								tasks.push(task);
							}
						}
					});
				});

				const usedNamesSet = new Set(moduleToSourceNameMapping.values());
				const conflictDetectionSet = new Set();

				// all modules in defined order (longest identifier first)
				const allModules = Array.from(moduleToSourceNameMapping.keys()).sort((a, b) => {
					const ai = typeof a === "string" ? a : a.identifier();
					const bi = typeof b === "string" ? b : b.identifier();
					return ai.length - bi.length;
				});

				// find modules with conflicting source names
				for(const module of allModules) {
					let sourceName = moduleToSourceNameMapping.get(module);
					let hasName = conflictDetectionSet.has(sourceName);
					if(!hasName) {
						conflictDetectionSet.add(sourceName);
						continue;
					}

					// try the fallback name first
					sourceName = ModuleFilenameHelpers.createFilename(module, fallbackModuleFilenameTemplate, requestShortener);
					hasName = usedNamesSet.has(sourceName);
					if(!hasName) {
						moduleToSourceNameMapping.set(module, sourceName);
						usedNamesSet.add(sourceName);
						continue;
					}

					// elsewise just append stars until we have a valid name
					while(hasName) {
						sourceName += "*";
						hasName = usedNamesSet.has(sourceName);
					}
					moduleToSourceNameMapping.set(module, sourceName);
					usedNamesSet.add(sourceName);
				}
				tasks.forEach(function(task) {
					const chunk = task.chunk;
					const file = task.file;
					const asset = task.asset;
					const sourceMap = task.sourceMap;
					const source = task.source;
					const modules = task.modules;
					const moduleFilenames = modules.map(m => moduleToSourceNameMapping.get(m));
					sourceMap.sources = moduleFilenames;
					if(sourceMap.sourcesContent && !options.noSources) {
						sourceMap.sourcesContent = sourceMap.sourcesContent.map((content, i) => `${content}\n\n\n${ModuleFilenameHelpers.createFooter(modules[i], requestShortener)}`);
					} else {
						sourceMap.sourcesContent = undefined;
					}
					sourceMap.sourceRoot = options.sourceRoot || "";
					sourceMap.file = file;
					asset.__SourceMapDevToolFile = file;
					asset.__SourceMapDevToolData = {};
					let currentSourceMappingURLComment = sourceMappingURLComment;
					if(currentSourceMappingURLComment !== false && /\.css($|\?)/i.test(file)) {
						currentSourceMappingURLComment = currentSourceMappingURLComment.replace(/^\n\/\/(.*)$/, "\n/*$1*/");
					}
					const sourceMapString = JSON.stringify(sourceMap);
					if(sourceMapFilename) {
						let filename = file;
						let query = "";
						const idx = filename.indexOf("?");
						if(idx >= 0) {
							query = filename.substr(idx);
							filename = filename.substr(0, idx);
						}
						let sourceMapFile = compilation.getPath(sourceMapFilename, {
							chunk,
							filename,
							query,
							basename: basename(filename)
						});
						if(sourceMapFile.indexOf("[contenthash]") !== -1) {
							sourceMapFile = sourceMapFile.replace(/\[contenthash\]/g, crypto.createHash("md5").update(sourceMapString).digest("hex"));
						}
						const sourceMapUrl = path.relative(path.dirname(file), sourceMapFile).replace(/\\/g, "/");
						if(currentSourceMappingURLComment !== false) {
							asset.__SourceMapDevToolData[file] = compilation.assets[file] = new ConcatSource(new RawSource(source), currentSourceMappingURLComment.replace(/\[url\]/g, sourceMapUrl));
						}
						asset.__SourceMapDevToolData[sourceMapFile] = compilation.assets[sourceMapFile] = new RawSource(sourceMapString);
						chunk.files.push(sourceMapFile);
					} else {
						asset.__SourceMapDevToolData[file] = compilation.assets[file] = new ConcatSource(new RawSource(source), currentSourceMappingURLComment
							.replace(/\[map\]/g, () => sourceMapString)
							.replace(/\[url\]/g, () => `data:application/json;charset=utf-8;base64,${new Buffer(sourceMapString, "utf-8").toString("base64")}`) // eslint-disable-line
						);
					}
				});
			});
		});
	}
}

module.exports = SourceMapDevToolPlugin;
