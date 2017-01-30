/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Tapable = require("tapable");
const ConcatSource = require("webpack-sources").ConcatSource;

const START_LOWERCASE_ALPHABET_CODE = "a".charCodeAt(0);
const START_UPPERCASE_ALPHABET_CODE = "A".charCodeAt(0);
const DELTA_A_TO_Z = "z".charCodeAt(0) - START_LOWERCASE_ALPHABET_CODE + 1;

module.exports = class Template extends Tapable {
	constructor(outputOptions) {
		super();
		this.outputOptions = outputOptions || {};
	}

	static getFunctionContent(fn) {
		return fn.toString().replace(/^function\s?\(\)\s?\{\n?|\n?\}$/g, "").replace(/^\t/mg, "");
	}

	static toIdentifier(str) {
		if(typeof str !== "string") return "";
		return str.replace(/^[^a-zA-Z$_]/, "_").replace(/[^a-zA-Z0-9$_]/g, "_");
	}

	// map number to a single character a-z, A-Z or <_ + number> if number is too big
	static numberToIdentifer(n) {
		// lower case
		if(n < DELTA_A_TO_Z) return String.fromCharCode(START_LOWERCASE_ALPHABET_CODE + n);

		// upper case
		n -= DELTA_A_TO_Z;
		if(n < DELTA_A_TO_Z) return String.fromCharCode(START_UPPERCASE_ALPHABET_CODE + n);

		// fall back to _ + number
		n -= DELTA_A_TO_Z;
		return "_" + n;
	}

	indent(str) {
		if(Array.isArray(str)) {
			var lengthModules = str.length;
			var result = Array(lengthModules);
			for(var index = 0; index < lengthModules; index++) {
				result[index] = this.indent(str[index]);
			}

			return result.join("\n");
		} else {
			var string = str.trimRight();
			if(!string) return "";
			var ind = (string[0] === "\n" ? "" : "\t");
			return ind + string.replace(/\n([^\n])/g, "\n\t$1");
		}
	}

	prefix(str, prefix) {
		if(Array.isArray(str)) {
			str = str.join("\n");
		}
		str = str.trim();
		if(!str) return "";
		let ind = (str[0] === "\n" ? "" : prefix);
		return ind + str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
	}

	asString(str) {
		if(Array.isArray(str)) {
			return str.join("\n");
		}
		return str;
	}

	getModulesArrayBounds(modules) {
		var maxId = -Infinity;
		var minId = Infinity;
		var objectOverhead = -1;
		for(var indexModule = 0; indexModule < modules.length; indexModule++) {
			var module = modules[indexModule];

			if(typeof module.id !== "number") {
				return false;
			}

			if(maxId < module.id) maxId = module.id;
			if(minId > module.id) minId = module.id;

			var idLength = (module.id + "").length;

			objectOverhead = objectOverhead + idLength + 2;
		}

		if(minId < 16 + ("" + minId).length) {
			// add minId x ',' instead of 'Array(minId).concat(...)'
			minId = 0;
		}

		var arrayOverhead = minId === 0 ? maxId : 16 + ("" + minId).length + maxId;
		return arrayOverhead < objectOverhead ? [minId, maxId] : false;
	}

	renderChunkModules(chunk, moduleTemplate, dependencyTemplates, prefix) {
		if(!prefix) prefix = "";
		var source = new ConcatSource();
		var modules = chunk.modules;
		var modulesLength = modules.length;
		if(modulesLength === 0) {
			source.add("[]");
			return source;
		}

		var removedModules = chunk.removedModules;
		var removedLength = removedModules && removedModules.length || 0;

		var modulesId = Object.create(null);

		var allModules = Array(modulesLength + removedLength);
		for(var indexModule = 0; indexModule < modulesLength; indexModule++) {
			var m = modules[indexModule];
			var moduleValue = {
				id: m.id,
				source: moduleTemplate.render(m, dependencyTemplates, chunk)
			};
			allModules[indexModule] = moduleValue;
			modulesId[m.id] = moduleValue;
		}

		for(var indexRemove = 0; indexRemove < removedLength; indexRemove++) {
			var id = removedModules[indexRemove];
			var payload = {
				id: id,
				source: "false"
			};
			allModules[indexModule] = payload;
			modulesId[id] = payload;
		}

		var bounds = this.getModulesArrayBounds(modules);

		if(bounds) {
			// Render a spare array
			var minId = bounds[0];
			var maxId = bounds[1];
			if(minId !== 0) source.add("Array(" + minId + ").concat(");
			source.add("[\n");
			for(var idx = minId; idx <= maxId; idx++) {
				var module = modulesId[idx];
				if(idx !== minId) source.add(",\n");
				source.add("/* " + idx + " */");
				if(module) {
					source.add("\n");
					source.add(module.source);
				}
			}
			source.add("\n" + prefix + "]");
			if(minId !== 0) source.add(")");
		} else {
			// Render an object
			source.add("{\n");
			allModules.sort(function(a, b) {
				var aId = a.id + "";
				var bId = b.id + "";
				if(aId < bId) return -1;
				if(aId > bId) return 1;
				return 0;
			}).forEach(function(module, idx) {
				if(idx !== 0) source.add(",\n");
				source.add("\n/***/ " + JSON.stringify(module.id) + ":\n");
				source.add(module.source);
			});
			source.add("\n\n" + prefix + "}");
		}
		return source;
	}
};
