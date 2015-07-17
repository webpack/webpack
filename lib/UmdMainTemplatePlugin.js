/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var OriginalSource = require("webpack-core/lib/OriginalSource");

function accessorToObjectAccess(accessor) {
	return accessor.map(function(a) {
		return "[" + JSON.stringify(a) + "]";
	}).join("");
}

function accessorAccess(base, accessor) {
	accessor = [].concat(accessor);
	return accessor.map(function(a, idx) {
		a = base + accessorToObjectAccess(accessor.slice(0, idx + 1));
		if(idx === accessor.length - 1) return a;
		return a + " = " + a + " || {}";
	}).join(", ");
}

function UmdMainTemplatePlugin(name, optionalAmdExternalAsGlobal) {
	this.name = name;
	this.optionalAmdExternalAsGlobal = optionalAmdExternalAsGlobal;
}
module.exports = UmdMainTemplatePlugin;
UmdMainTemplatePlugin.prototype.apply = function(compilation) {
	var mainTemplate = compilation.mainTemplate;
	compilation.templatesPlugin("render-with-entry", function(source, chunk, hash) {
		var externals = chunk.modules.filter(function(m) {
			return m.external;
		});
		var optionalExternals = [],
			requiredExternals = [];
		if(this.optionalAmdExternalAsGlobal) {
			externals.forEach(function(m) {
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
				hash: hash,
				chunk: chunk
			});
		}

		function externalsDepsArray(modules) {
			return "[" + replaceKeys(modules.map(function(m) {
				return JSON.stringify(typeof m.request === "object" ? m.request.amd : m.request);
			}).join(", ")) + "]";
		}

		function externalsRootArray(modules) {
			return replaceKeys(modules.map(function(m) {
				var request = m.request;
				if(typeof request === "object") request = request.root;
				return "root" + accessorToObjectAccess([].concat(request));
			}).join(", "));
		}

		function externalsRequireArray(type) {
			return replaceKeys(externals.map(function(m) {
				var request = m.request;
				if(typeof request === "object") request = request[type];
				if(Array.isArray(request)) {
					var expr = "require(" + JSON.stringify(request[0]) + ")" + accessorToObjectAccess(request.slice(1));
				} else
					var expr = "require(" + JSON.stringify(request) + ")";
				if(m.optional) {
					expr = "(function webpackLoadOptionalExternalModule() { try { return " + expr + "; } catch(e) {} }())";
				}
				return expr;
			}).join(", "));
		}

		function externalsArguments(modules) {
			return modules.map(function(m) {
				return "__WEBPACK_EXTERNAL_MODULE_" + m.id + "__";
			}).join(", ");
		}
		if(optionalExternals.length > 0) {
			var amdFactory = "function webpackLoadOptionalExternalModuleAmd(" + externalsArguments(requiredExternals) + ") {\n" +
				"			return factory(" + (
					requiredExternals.length > 0 ?
					externalsArguments(requiredExternals) + ", " + externalsRootArray(optionalExternals) :
					externalsRootArray(optionalExternals)
				) + ");\n" +
				"		}";
		} else {
			var amdFactory = "factory";
		}
		return new ConcatSource(new OriginalSource(
			"(function webpackUniversalModuleDefinition(root, factory) {\n" +
			"	if(typeof exports === 'object' && typeof module === 'object')\n" +
			"		module.exports = factory(" + externalsRequireArray("commonjs2") + ");\n" +
			"	else if(typeof define === 'function' && define.amd)\n" +
			(requiredExternals.length > 0 ?
				"		define(" + externalsDepsArray(requiredExternals) + ", " + amdFactory + ");\n" :
				"		define(" + amdFactory + ");\n"
			) +
			(this.name ?
				"	else if(typeof exports === 'object')\n" +
				"		exports[" + JSON.stringify(replaceKeys([].concat(this.name).pop())) + "] = factory(" + externalsRequireArray("commonjs") + ");\n" +
				"	else\n" +
				"		" + replaceKeys(accessorAccess("root", this.name)) + " = factory(" + externalsRootArray(externals) + ");\n" :
				"	else {\n" +
				(externals.length > 0 ?
					"		var a = typeof exports === 'object' ? factory(" + externalsRequireArray("commonjs") + ") : factory(" + externalsRootArray(externals) + ");\n" :
					"		var a = factory();\n"
				) +
				"		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];\n" +
				"	}\n"
			) +
			"})(this, function(" + externalsArguments(externals) + ") {\nreturn ", "webpack/universalModuleDefinition"), source, "\n});\n");
	}.bind(this));
	mainTemplate.plugin("global-hash-paths", function(paths) {
		if(this.name) paths = paths.concat(this.name);
		return paths;
	}.bind(this));
	mainTemplate.plugin("hash", function(hash) {
		hash.update("umd");
		hash.update(this.name + "");
	}.bind(this));
};
