/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Tapable = require("tapable");
var ConcatSource = require("webpack-sources").ConcatSource;

function Template(outputOptions) {
	Tapable.call(this);
	this.outputOptions = outputOptions || {};
}
module.exports = Template;

Template.getFunctionContent = function(fn) {
	return fn.toString().replace(/^function\s?\(\)\s?\{\n?|\n?\}$/g, "").replace(/^\t/mg, "");
};

Template.toIdentifier = function(str) {
	if(typeof str !== "string") return "";
	return str.replace(/^[^a-zA-Z$_]/, "_").replace(/[^a-zA-Z0-9$_]/g, "_");
};

var A_CODE = "a".charCodeAt(0);
var Z_CODE = "z".charCodeAt(0);
var AZ_COUNT = Z_CODE - A_CODE + 1;
var A2_CODE = "A".charCodeAt(0);
var Z2_CODE = "Z".charCodeAt(0);
var AZ2_COUNT = Z2_CODE - A2_CODE + 1;
Template.numberToIdentifer = function numberToIdentifer(n) {
	if(n < AZ_COUNT) return String.fromCharCode(A_CODE + n);
	if(n < AZ_COUNT + AZ2_COUNT) return String.fromCharCode(A2_CODE + n - AZ_COUNT);
	return "_" + (n - AZ_COUNT - AZ2_COUNT);
};

Template.prototype = Object.create(Tapable.prototype);
Template.prototype.constructor = Template;

Template.prototype.indent = function indent(str) {
	if(Array.isArray(str)) {
		return str.map(indent).join("\n");
	} else {
		str = str.trimRight();
		if(!str) return "";
		var ind = (str[0] === "\n" ? "" : "\t");
		return ind + str.replace(/\n([^\n])/g, "\n\t$1");
	}
};

Template.prototype.prefix = function(str, prefix) {
	if(Array.isArray(str)) {
		str = str.join("\n");
	}
	str = str.trim();
	if(!str) return "";
	var ind = (str[0] === "\n" ? "" : prefix);
	return ind + str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
};

Template.prototype.asString = function(str) {
	if(Array.isArray(str)) {
		return str.join("\n");
	}
	return str;
};

function moduleIdIsNumber(module) {
	return typeof module.id === "number";
}

Template.prototype.getModulesArrayBounds = function(modules) {
	if(!modules.every(moduleIdIsNumber))
		return false;
	var maxId = -Infinity;
	var minId = Infinity;
	modules.forEach(function(module) {
		if(maxId < module.id) maxId = module.id;
		if(minId > module.id) minId = module.id;
	});
	if(minId < 16 + ("" + minId).length) {
		// add minId x ',' instead of 'Array(minId).concat(...)'
		minId = 0;
	}
	var objectOverhead = modules.map(function(module) {
		var idLength = (module.id + "").length;
		return idLength + 2;
	}).reduce(function(a, b) {
		return a + b;
	}, -1);
	var arrayOverhead = minId === 0 ? maxId : 16 + ("" + minId).length + maxId;
	return arrayOverhead < objectOverhead ? [minId, maxId] : false;
};

Template.prototype.renderChunkModules = function(chunk, moduleTemplate, dependencyTemplates, prefix) {
	if(!prefix) prefix = "";
	var source = new ConcatSource();
	if(chunk.modules.length === 0) {
		source.add("[]");
		return source;
	}
	var removedModules = chunk.removedModules;
	var allModules = chunk.modules.map(function(module) {
		return {
			id: module.id,
			source: moduleTemplate.render(module, dependencyTemplates, chunk)
		};
	});
	if(removedModules && removedModules.length > 0) {
		removedModules.forEach(function(id) {
			allModules.push({
				id: id,
				source: "false"
			});
		});
	}
	var bounds = this.getModulesArrayBounds(chunk.modules);

	if(bounds) {
		// Render a spare array
		var minId = bounds[0];
		var maxId = bounds[1];
		if(minId !== 0) source.add("Array(" + minId + ").concat(");
		source.add("[\n");
		var modules = {};
		allModules.forEach(function(module) {
			modules[module.id] = module;
		});
		for(var idx = minId; idx <= maxId; idx++) {
			var module = modules[idx];
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
};
