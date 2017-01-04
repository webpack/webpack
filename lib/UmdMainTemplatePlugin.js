"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const webpackSources = require("webpack-sources");
function accessorToObjectAccess(accessor) {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
}
function accessorAccess(base, accessor) {
	let accessorArr = [].concat(accessor);
	return accessorArr.map((a, idx) => {
		a = base + accessorToObjectAccess(accessorArr.slice(0, idx + 1));
		if(idx === accessorArr.length - 1) {
			return a;
		}
		return `${a} = ${a} || {}`;
	}).join(", ");
}
class UmdMainTemplatePlugin {
	constructor(name, options) {
		this.name = name;
		this.optionalAmdExternalAsGlobal = options.optionalAmdExternalAsGlobal;
		this.namedDefine = options.namedDefine;
		this.auxiliaryComment = options.auxiliaryComment;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;
		compilation.templatesPlugin("render-with-entry", (source, chunk, hash) => {
			let externals = chunk.modules.filter((m) => m.external);
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
				return `[${replaceKeys(modules.map((m) => JSON.stringify(typeof m.request === "object" ? m.request.amd : m.request))
					.join(", "))}]`;
			}

			function externalsRootArray(modules) {
				return replaceKeys(modules.map(m => {
					let request = m.request;
					if(typeof request === "object") {
						// todo: here is strange, although it works, but against the documentation
						request = request.root;
					}
					return `root${accessorToObjectAccess([].concat(request))}`;
				}).join(", "));
			}

			function externalsRequireArray(type) {
				return replaceKeys(externals.map(m => {
					let expr;
					let request = m.request;
					if(typeof request === "object") {
						request = request[type];
					}
					if(Array.isArray(request)) {
						expr = `require(${JSON.stringify(request[0])})${accessorToObjectAccess(request.slice(1))}`;
					} else {
						expr = `require(${JSON.stringify(request)})`;
					}
					if(m.optional) {
						expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
					}
					return expr;
				})
					.join(", "));
			}

			function externalsArguments(modules) {
				return modules.map(m => `__WEBPACK_EXTERNAL_MODULE_${m.id}__`)
					.join(", ");
			}

			function libraryName(library) {
				return JSON.stringify(replaceKeys([].concat(library).pop()));
			}

			let amdFactory;
			if(optionalExternals.length > 0) {
				amdFactory = `function webpackLoadOptionalExternalModuleAmd(${externalsArguments(requiredExternals)}) {\n\t\t\treturn factory(${requiredExternals.length > 0
					? externalsArguments(requiredExternals) + ", " + externalsRootArray(optionalExternals)
					: externalsRootArray(optionalExternals)});\n\t\t}`;
			} else {
				amdFactory = "factory";
			}
			return new webpackSources.ConcatSource(new webpackSources.OriginalSource(`
(function webpackUniversalModuleDefinition(root, factory) {
    ${normalizeAuxiliaryComment(this.auxiliaryComment, "commonjs2")}
    if(typeof exports === "object" && typeof module === "object")
        module.exports = factory(${externalsRequireArray("commonjs2")});
    ${normalizeAuxiliaryComment(this.auxiliaryComment, "amd")}
    else if(typeof define === "function" && define.amd)
` +
				(requiredExternals.length > 0
					? (this.name && this.namedDefine === true
						? `        define(${libraryName(this.name)}, ${externalsDepsArray(requiredExternals)}, ${amdFactory});`
						: `        define(${externalsDepsArray(requiredExternals)}, ${amdFactory});`)
					: (this.name && this.namedDefine === true
						? `        define(${libraryName(this.name)}, [], ${amdFactory});`
						: `        define([], ${amdFactory});`)) +
				(this.name
					? `
    ${normalizeAuxiliaryComment(this.auxiliaryComment, "commonjs")}
    else if(typeof exports === "object")
        exports[${libraryName(this.name)}] = factory(${externalsRequireArray("commonjs")});
    ${normalizeAuxiliaryComment(this.auxiliaryComment, "root")}
    else
        ${replaceKeys(accessorAccess("root", this.name))} = factory(${externalsRootArray(externals)});
`
					: `
    else {
${(externals.length > 0
						? `        var a = typeof exports === "object" ? factory(${externalsRequireArray("commonjs")}) : factory(${externalsRootArray(externals)});`
						: "        var a = factory();")}
        for(var i in a) (typeof exports === "object" ? exports : root)[i] = a[i];
    }
`)
				+
				`})(this, function(${externalsArguments(externals)}) {\nreturn `, "webpack/universalModuleDefinition"), source, ";\n})");
		});
		mainTemplate.plugin("global-hash-paths", (paths) => {
			if(this.name) {
				paths = paths.concat(this.name);
			}
			return paths;
		});
		mainTemplate.plugin("hash", (hash) => {
			hash.update("umd");
			hash.update(`${this.name}`);
		});
	}
}
function isString(val) {
	return typeof val === "string";
}
function normalizeAuxiliaryComment(auxiliaryComment, type) {
	if(auxiliaryComment) {
		if(isString(auxiliaryComment)) {
			return `//${auxiliaryComment}`;
		} else if(auxiliaryComment[type]) {
			return `//${auxiliaryComment[type]}`;
		}
	}
	return "";
}
module.exports = UmdMainTemplatePlugin;
