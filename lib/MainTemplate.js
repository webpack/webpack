/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const PrefixSource = require("webpack-sources").PrefixSource;
const Template = require("./Template");

// require function shortcuts:
// __webpack_require__.s = the module id of the entry point
// __webpack_require__.c = the module cache
// __webpack_require__.m = the module functions
// __webpack_require__.p = the bundle public path
// __webpack_require__.i = the identity function used for harmony imports
// __webpack_require__.e = the chunk ensure function
// __webpack_require__.d = the exported propery define getter function
// __webpack_require__.o = Object.prototype.hasOwnProperty.call
// __webpack_require__.n = compatibility get default export
// __webpack_require__.h = the webpack hash
// __webpack_require__.oe = the uncatched error handler for the webpack runtime
// __webpack_require__.nc = the script nonce

module.exports = class MainTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
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
			const modules = this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates, "/******/ ");
			source.add(this.applyPluginsWaterfall("modules", modules, chunk, hash, moduleTemplate, dependencyTemplates));
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
				this.indent(this.applyPluginsWaterfall("module-obj", "", chunk, hash, "moduleId")),
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
			if(chunk.chunks.length > 0) {
				buf.push("// This file contains only the entry chunk.");
				buf.push("// The chunk loading function for additional chunks");
				buf.push(`${this.requireFn}.e = function requireEnsure(chunkId) {`);
				buf.push(this.indent(this.applyPluginsWaterfall("require-ensure", "throw new Error('Not chunk loading available');", chunk, hash, "chunkId")));
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

	render(hash, chunk, moduleTemplate, dependencyTemplates) {
		const buf = [];
		buf.push(this.applyPluginsWaterfall("bootstrap", "", chunk, hash, moduleTemplate, dependencyTemplates));
		buf.push(this.applyPluginsWaterfall("local-vars", "", chunk, hash));
		buf.push("");
		buf.push("// The require function");
		buf.push(`function ${this.requireFn}(moduleId) {`);
		buf.push(this.indent(this.applyPluginsWaterfall("require", "", chunk, hash)));
		buf.push("}");
		buf.push("");
		buf.push(this.asString(this.applyPluginsWaterfall("require-extensions", "", chunk, hash)));
		buf.push("");
		buf.push(this.asString(this.applyPluginsWaterfall("startup", "", chunk, hash)));
		let source = this.applyPluginsWaterfall("render", new OriginalSource(this.prefix(buf, " \t") + "\n", `webpack/bootstrap ${hash}`), chunk, hash, moduleTemplate, dependencyTemplates);
		if(chunk.hasEntryModule()) {
			source = this.applyPluginsWaterfall("render-with-entry", source, chunk, hash);
		}
		if(!source) throw new Error("Compiler error: MainTemplate plugin 'render' should return something");
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	renderRequireFunctionForModule(hash, chunk, varModuleId) {
		return this.applyPluginsWaterfall("module-require", this.requireFn, chunk, hash, varModuleId);
	}

	renderAddModule(hash, chunk, varModuleId, varModule) {
		return this.applyPluginsWaterfall("add-module", `modules[${varModuleId}] = ${varModule};`, chunk, hash, varModuleId, varModule);
	}

	renderCurrentHashCode(hash, length) {
		length = length || Infinity;
		return this.applyPluginsWaterfall("current-hash", JSON.stringify(hash.substr(0, length)), length);
	}

	entryPointInChildren(chunk) {
		const checkChildren = (chunk, alreadyCheckedChunks) => {
			return chunk.chunks.some((child) => {
				if(alreadyCheckedChunks.indexOf(child) >= 0) return;
				alreadyCheckedChunks.push(child);
				return child.hasEntryModule() || checkChildren(child, alreadyCheckedChunks);
			});
		};
		return checkChildren(chunk, []);
	}

	getPublicPath(options) {
		return this.applyPluginsWaterfall("asset-path", this.outputOptions.publicPath || "", options);
	}

	updateHash(hash) {
		hash.update("maintemplate");
		hash.update("3");
		hash.update(this.outputOptions.publicPath + "");
		this.applyPlugins("hash", hash);
	}

	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.applyPlugins("hash-for-chunk", hash, chunk);
	}

	useChunkHash(chunk) {
		const paths = this.applyPluginsWaterfall("global-hash-paths", []);
		return !this.applyPluginsBailResult("global-hash", chunk, paths);
	}
};
