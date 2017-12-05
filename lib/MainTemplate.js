/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const PrefixSource = require("webpack-sources").PrefixSource;
const Template = require("./Template");
const SyncWaterfallHook = require("tapable").SyncWaterfallHook;
const SyncHook = require("tapable").SyncHook;
const SyncBailHook = require("tapable").SyncBailHook;

// require function shortcuts:
// __webpack_require__.s = the module id of the entry point
// __webpack_require__.c = the module cache
// __webpack_require__.m = the module functions
// __webpack_require__.p = the bundle public path
// __webpack_require__.i = the identity function used for harmony imports
// __webpack_require__.e = the chunk ensure function
// __webpack_require__.d = the exported propery define getter function
// __webpack_require__.o = Object.prototype.hasOwnProperty.call
// __webpack_require__.r = define compatibility on export
// __webpack_require__.n = compatibility get default export
// __webpack_require__.h = the webpack hash
// __webpack_require__.w = an object containing all installed WebAssembly.Modules keys by module id
// __webpack_require__.oe = the uncatched error handler for the webpack runtime
// __webpack_require__.nc = the script nonce

module.exports = class MainTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
		this.hooks = {
			modules: new SyncWaterfallHook(["modules", "chunk", "hash", "moduleTemplate", "dependencyTemplates"]),
			moduleObj: new SyncWaterfallHook(["source", "chunk", "hash", "moduleIdExpression"]),
			requireEnsure: new SyncWaterfallHook(["source", "chunk", "hash", "chunkIdExpression"]),
			bootstrap: new SyncWaterfallHook(["source", "chunk", "hash", "moduleTemplate", "dependencyTemplates"]),
			localVars: new SyncWaterfallHook(["source", "chunk", "hash"]),
			require: new SyncWaterfallHook(["source", "chunk", "hash"]),
			requireExtensions: new SyncWaterfallHook(["source", "chunk", "hash"]),
			startup: new SyncWaterfallHook(["source", "chunk", "hash"]),
			render: new SyncWaterfallHook(["source", "chunk", "hash", "moduleTemplate", "dependencyTemplates"]),
			renderWithEntry: new SyncWaterfallHook(["source", "chunk", "hash"]),
			moduleRequire: new SyncWaterfallHook(["source", "chunk", "hash", "moduleIdExpression"]),
			addModule: new SyncWaterfallHook(["source", "chunk", "hash", "moduleIdExpression", "moduleExpression"]),
			currentHash: new SyncWaterfallHook(["source", "requestedLength"]),
			assetPath: new SyncWaterfallHook(["path", "options"]),
			hash: new SyncHook(["hash"]),
			hashForChunk: new SyncHook(["hash", "chunk"]),
			globalHashPaths: new SyncWaterfallHook(["paths"]),
			globalHash: new SyncBailHook(["chunk", "paths"]),

			// TODO this should be moved somewhere else
			// It's weird here
			hotBootstrap: new SyncWaterfallHook(["source", "chunk", "hash"])
		};
		this.plugin("startup", (source, chunk, hash) => {
			const buf = [];
			if(chunk.entryModule) {
				buf.push("// Load entry module and return exports");
				buf.push(`return ${this.renderRequireFunctionForModule(hash, chunk, JSON.stringify(chunk.entryModule.id))}(${this.requireFn}.s = ${JSON.stringify(chunk.entryModule.id)});`);
			}
			return this.asString(buf);
		});
		this.plugin("render", (bootstrapSource, chunk, hash, moduleTemplate, dependencyTemplates) => {
			const source = new ConcatSource();
			source.add("/******/ (function(modules) { // webpackBootstrap\n");
			source.add(new PrefixSource("/******/", bootstrapSource));
			source.add("/******/ })\n");
			source.add("/************************************************************************/\n");
			source.add("/******/ (");
			const modules = this.renderChunkModules(chunk, () => true, moduleTemplate, dependencyTemplates, "/******/ ");
			source.add(this.hooks.modules.call(modules, chunk, hash, moduleTemplate, dependencyTemplates));
			source.add(")");
			return source;
		});
		this.plugin("local-vars", (source, chunk, hash) => {
			return this.asString([
				source,
				"// The module cache",
				"var installedModules = {};"
			]);
		});
		this.plugin("require", (source, chunk, hash) => {
			return this.asString([
				source,
				"// Check if module is in cache",
				"if(installedModules[moduleId]) {",
				this.indent("return installedModules[moduleId].exports;"),
				"}",
				"// Create a new module (and put it into the cache)",
				"var module = installedModules[moduleId] = {",
				this.indent(this.hooks.moduleObj.call("", chunk, hash, "moduleId")),
				"};",
				"",
				this.asString(outputOptions.strictModuleExceptionHandling ? [
					"// Execute the module function",
					"var threw = true;",
					"try {",
					this.indent([
						`modules[moduleId].call(module.exports, module, module.exports, ${this.renderRequireFunctionForModule(hash, chunk, "moduleId")});`,
						"threw = false;"
					]),
					"} finally {",
					this.indent([
						"if(threw) delete installedModules[moduleId];"
					]),
					"}"
				] : [
					"// Execute the module function",
					`modules[moduleId].call(module.exports, module, module.exports, ${this.renderRequireFunctionForModule(hash, chunk, "moduleId")});`,
				]),
				"",
				"// Flag the module as loaded",
				"module.l = true;",
				"",
				"// Return the exports of the module",
				"return module.exports;"
			]);
		});
		this.plugin("module-obj", (source, chunk, hash, varModuleId) => {
			return this.asString([
				"i: moduleId,",
				"l: false,",
				"exports: {}"
			]);
		});
		this.plugin("require-extensions", (source, chunk, hash) => {
			const buf = [];
			if(chunk.getNumberOfChunks() > 0) {
				buf.push("// This file contains only the entry chunk.");
				buf.push("// The chunk loading function for additional chunks");
				buf.push(`${this.requireFn}.e = function requireEnsure(chunkId) {`);
				buf.push(this.indent("var promises = [];"));
				buf.push(this.indent(this.hooks.requireEnsure.call("", chunk, hash, "chunkId")));
				buf.push(this.indent("return Promise.all(promises);"));
				buf.push("};");
			}
			buf.push("");
			buf.push("// expose the modules object (__webpack_modules__)");
			buf.push(`${this.requireFn}.m = modules;`);

			buf.push("");
			buf.push("// expose the module cache");
			buf.push(`${this.requireFn}.c = installedModules;`);

			buf.push("");
			buf.push("// define getter function for harmony exports");
			buf.push(`${this.requireFn}.d = function(exports, name, getter) {`);
			buf.push(this.indent([
				`if(!${this.requireFn}.o(exports, name)) {`,
				this.indent([
					"Object.defineProperty(exports, name, {",
					this.indent([
						"configurable: false,",
						"enumerable: true,",
						"get: getter"
					]),
					"});"
				]),
				"}"
			]));
			buf.push("};");

			buf.push("");
			buf.push("// define __esModule on exports");
			buf.push(`${this.requireFn}.r = function(exports) {`);
			buf.push(this.indent([
				"Object.defineProperty(exports, '__esModule', { value: true });"
			]));
			buf.push("};");

			buf.push("");
			buf.push("// getDefaultExport function for compatibility with non-harmony modules");
			buf.push(this.requireFn + ".n = function(module) {");
			buf.push(this.indent([
				"var getter = module && module.__esModule ?",
				this.indent([
					"function getDefault() { return module['default']; } :",
					"function getModuleExports() { return module; };"
				]),
				`${this.requireFn}.d(getter, 'a', getter);`,
				"return getter;"
			]));
			buf.push("};");

			buf.push("");
			buf.push("// Object.prototype.hasOwnProperty.call");
			buf.push(`${this.requireFn}.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };`);

			const publicPath = this.getPublicPath({
				hash: hash
			});
			buf.push("");
			buf.push("// __webpack_public_path__");
			buf.push(`${this.requireFn}.p = ${JSON.stringify(publicPath)};`);
			return this.asString(buf);
		});

		this.requireFn = "__webpack_require__";
	}

	getRenderManifest(options) {
		const chunk = options.chunk;
		const hash = options.hash;
		const fullHash = options.fullHash;
		const outputOptions = options.outputOptions;
		const moduleTemplates = options.moduleTemplates;
		const dependencyTemplates = options.dependencyTemplates;

		const result = [];

		let filenameTemplate;
		if(chunk.filenameTemplate)
			filenameTemplate = chunk.filenameTemplate;
		else if(chunk.isInitial())
			filenameTemplate = outputOptions.filename;
		else {
			filenameTemplate = outputOptions.chunkFilename;
		}

		const useChunkHash = this.useChunkHash(chunk);

		result.push({
			render: () => this.render(hash, chunk, moduleTemplates.javascript, dependencyTemplates),
			filenameTemplate,
			pathOptions: {
				noChunkHash: !useChunkHash,
				chunk
			},
			identifier: `chunk${chunk.id}`,
			hash: useChunkHash ? chunk.hash : fullHash
		});

		return result;
	}

	render(hash, chunk, moduleTemplate, dependencyTemplates) {
		const buf = [];
		buf.push(this.hooks.bootstrap.call("", chunk, hash, moduleTemplate, dependencyTemplates));
		buf.push(this.hooks.localVars.call("", chunk, hash));
		buf.push("");
		buf.push("// The require function");
		buf.push(`function ${this.requireFn}(moduleId) {`);
		buf.push(this.indent(this.hooks.require.call("", chunk, hash)));
		buf.push("}");
		buf.push("");
		buf.push(this.asString(this.hooks.requireExtensions.call("", chunk, hash)));
		buf.push("");
		buf.push(this.asString(this.hooks.startup.call("", chunk, hash)));
		let source = this.hooks.render.call(new OriginalSource(this.prefix(buf, " \t") + "\n", `webpack/bootstrap ${hash}`), chunk, hash, moduleTemplate, dependencyTemplates);
		if(chunk.hasEntryModule()) {
			source = this.hooks.renderWithEntry.call(source, chunk, hash);
		}
		if(!source) throw new Error("Compiler error: MainTemplate plugin 'render' should return something");
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	renderRequireFunctionForModule(hash, chunk, varModuleId) {
		return this.hooks.moduleRequire.call(this.requireFn, chunk, hash, varModuleId);
	}

	renderAddModule(hash, chunk, varModuleId, varModule) {
		return this.hooks.addModule.call(`modules[${varModuleId}] = ${varModule};`, chunk, hash, varModuleId, varModule);
	}

	renderCurrentHashCode(hash, length) {
		length = length || Infinity;
		return this.hooks.currentHash.call(JSON.stringify(hash.substr(0, length)), length);
	}

	entryPointInChildren(chunk) {
		const checkChildren = (chunk, alreadyCheckedChunks) => {
			for(const child of chunk.chunksIterable) {
				if(!alreadyCheckedChunks.has(child)) {
					alreadyCheckedChunks.add(child);
					if(child.hasEntryModule() || checkChildren(child, alreadyCheckedChunks)) {
						return true;
					}
				}
			}
		};
		return checkChildren(chunk, new Set()) === true;
	}

	getPublicPath(options) {
		return this.hooks.assetPath.call(this.outputOptions.publicPath || "", options);
	}

	getAssetPath(path, options) {
		return this.hooks.assetPath.call(path, options);
	}

	updateHash(hash) {
		hash.update("maintemplate");
		hash.update("3");
		hash.update(this.outputOptions.publicPath + "");
		this.hooks.hash.call(hash);
	}

	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
	}

	useChunkHash(chunk) {
		const paths = this.hooks.globalHashPaths.call([]);
		return !this.hooks.globalHash.call(chunk, paths);
	}
};
