/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const Template = require("./Template");

function accessorToObjectAccess(accessor) {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
}

function accessorAccess(base, accessor) {
	accessor = [].concat(accessor);
	return accessor.map((a, idx) => {
		a = base + accessorToObjectAccess(accessor.slice(0, idx + 1));
		if(idx === accessor.length - 1) return a;
		return `${a} = ${a} || {}`;
	}).join(", ");
}

class UmdMainTemplatePlugin {
	constructor(name, options) {
		if(typeof name === "object" && !Array.isArray(name)) {
			this.name = name.root || name.amd || name.commonjs;
			this.names = name;
		} else {
			this.name = name;
			this.names = {
				commonjs: name,
				root: name,
				amd: name
			};
		}
		this.optionalAmdExternalAsGlobal = options.optionalAmdExternalAsGlobal;
		this.namedDefine = options.namedDefine;
		this.auxiliaryComment = options.auxiliaryComment;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;
		compilation.templatesPlugin("render-with-entry", (source, chunk, hash) => {
			let externals = chunk.getModules().filter(m => m.external && (m.type === "umd" || m.type === "umd2"));
			const optionalExternals = [];
			let requiredExternals = [];
			if(this.optionalAmdExternalAsGlobal) {
				externals.forEach(m => {
					if(m.optional) {
						optionalExternals.push(m);
					} else {
						requiredExternals.push(m);
					}
				});
				externals = requiredExternals.concat(optionalExternals);
			} else {
				requiredExternals = externals;
			}

			function replaceKeys(str) {
				return mainTemplate.applyPluginsWaterfall("asset-path", str, {
					hash,
					chunk
				});
			}

			function externalsDepsArray(modules) {
				return `[${replaceKeys(modules.map(m => JSON.stringify(typeof m.request === "object" ? m.request.amd : m.request)).join(", "))}]`;
			}

			function externalsRootArray(modules) {
				return replaceKeys(modules.map(m => {
					let request = m.request;
					if(typeof request === "object") request = request.root;
					return `root${accessorToObjectAccess([].concat(request))}`;
				}).join(", "));
			}

			function externalsRequireArray(type) {
				return replaceKeys(externals.map(m => {
					let expr;
					let request = m.request;
					if(typeof request === "object") request = request[type];
					if(typeof request === "undefined") throw new Error("Missing external configuration for type:" + type);
					if(Array.isArray(request)) {
						expr = `require(${JSON.stringify(request[0])})${accessorToObjectAccess(request.slice(1))}`;
					} else
						expr = `require(${JSON.stringify(request)})`;
					if(m.optional) {
						expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
					}
					return expr;
				}).join(", "));
			}

			function externalsArguments(modules) {
				return modules.map(m => Template.toIdentifier(`__WEBPACK_EXTERNAL_MODULE_${m.id}__`)).join(", ");
			}

			function libraryName(library) {
				return JSON.stringify(replaceKeys([].concat(library).pop()));
			}

			let amdFactory;
			if(optionalExternals.length > 0) {
				const wrapperArguments = externalsArguments(requiredExternals);
				const factoryArguments = requiredExternals.length > 0 ?
					externalsArguments(requiredExternals) + ", " + externalsRootArray(optionalExternals) :
					externalsRootArray(optionalExternals);
				amdFactory = `function webpackLoadOptionalExternalModuleAmd(${wrapperArguments}) {\n` +
					`			return factory(${factoryArguments});\n` +
					"		}";
			} else {
				amdFactory = "factory";
			}

			return new ConcatSource(new OriginalSource(
				"(function webpackUniversalModuleDefinition(root, factory) {\n" +
				(this.auxiliaryComment &&
					typeof this.auxiliaryComment === "string" ?
					"   //" + this.auxiliaryComment + "\n" :
					this.auxiliaryComment.commonjs2 ?
					"   //" + this.auxiliaryComment.commonjs2 + "\n" :
					""
				) +
				"	if(typeof exports === 'object' && typeof module === 'object')\n" +
				"		module.exports = factory(" + externalsRequireArray("commonjs2") + ");\n" +
				(this.auxiliaryComment &&
					typeof this.auxiliaryComment === "string" ?
					"   //" + this.auxiliaryComment + "\n" :
					this.auxiliaryComment.amd ?
					"   //" + this.auxiliaryComment.amd + "\n" :
					""
				) +
				"	else if(typeof define === 'function' && define.amd)\n" +
				(requiredExternals.length > 0 ?
					(this.names.amd && this.namedDefine === true ?
						"		define(" + libraryName(this.names.amd) + ", " + externalsDepsArray(requiredExternals) + ", " + amdFactory + ");\n" :
						"		define(" + externalsDepsArray(requiredExternals) + ", " + amdFactory + ");\n"
					) :
					(this.names.amd && this.namedDefine === true ?
						"		define(" + libraryName(this.names.amd) + ", [], " + amdFactory + ");\n" :
						"		define([], " + amdFactory + ");\n"
					)
				) +
				(this.names.root || this.names.commonjs ?
					(this.auxiliaryComment &&
						typeof this.auxiliaryComment === "string" ?
						"   //" + this.auxiliaryComment + "\n" :
						this.auxiliaryComment.commonjs ?
						"   //" + this.auxiliaryComment.commonjs + "\n" :
						""
					) +
					"	else if(typeof exports === 'object')\n" +
					"		exports[" + libraryName(this.names.commonjs || this.names.root) + "] = factory(" + externalsRequireArray("commonjs") + ");\n" +
					(this.auxiliaryComment &&
						typeof this.auxiliaryComment === "string" ?
						"   //" + this.auxiliaryComment + "\n" :
						this.auxiliaryComment.root ?
						"   //" + this.auxiliaryComment.root + "\n" :
						""
					) +
					"	else\n" +
					"		" + replaceKeys(accessorAccess("root", this.names.root || this.names.commonjs)) + " = factory(" + externalsRootArray(externals) + ");\n" :
					"	else {\n" +
					(externals.length > 0 ?
						"		var a = typeof exports === 'object' ? factory(" + externalsRequireArray("commonjs") + ") : factory(" + externalsRootArray(externals) + ");\n" :
						"		var a = factory();\n"
					) +
					"		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];\n" +
					"	}\n"
				) +
				"})(this, function(" + externalsArguments(externals) + ") {\nreturn ", "webpack/universalModuleDefinition"), source, ";\n})");
		});
		mainTemplate.plugin("global-hash-paths", (paths) => {
			if(this.names.root) paths = paths.concat(this.names.root);
			if(this.names.amd) paths = paths.concat(this.names.amd);
			if(this.names.commonjs) paths = paths.concat(this.names.commonjs);
			return paths;
		});
		mainTemplate.plugin("hash", (hash) => {
			hash.update("umd");
			hash.update(`${this.names.root}`);
			hash.update(`${this.names.amd}`);
			hash.update(`${this.names.commonjs}`);
		});
	}
}

module.exports = UmdMainTemplatePlugin;
