/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SetVarMainTemplatePlugin = require("./SetVarMainTemplatePlugin");
var templatePlugins = {};

function accessorToObjectAccess(accessor) {
	return accessor.map(function(a) {
		return "[" + JSON.stringify(a) + "]";
	}).join("");
}

function accessorAccess(base, accessor, joinWith) {
	accessor = [].concat(accessor);
	return accessor.map(function(a, idx) {
		a = base ?
			base + accessorToObjectAccess(accessor.slice(0, idx + 1)) :
			accessor[0] + accessorToObjectAccess(accessor.slice(1, idx + 1));
		if(idx === accessor.length - 1) return a;
		if(idx === 0 && typeof base === "undefined") return a + " = typeof " + a + " === \"object\" ? " + a + " : {}";
		return a + " = " + a + " || {}";
	}).join(joinWith || "; ");
}

function LibraryTemplatePlugin(name, target, umdNamedDefine) {
	this.name = name;
	this.target = target;
	this.umdNamedDefine = umdNamedDefine;
}
module.exports = LibraryTemplatePlugin;

LibraryTemplatePlugin.registTemplatePlugin = registTemplatePlugin;

LibraryTemplatePlugin.prototype.apply = function(compiler) {
	compiler.plugin("this-compilation", function(compilation) {
		var plugin;
		if (!templatePlugins.hasOwnProperty(this.target)) {
			throw new Error(this.target + " is not a valid Library target");
		}
		plugin = templatePlugins[this.target].apply(this);
		compilation.apply(plugin);
	}.bind(this));
};

registTemplatePlugin("var", function() {
	return new SetVarMainTemplatePlugin("var " + accessorAccess(false, this.name));
});

registTemplatePlugin("assign", function() {
	return new SetVarMainTemplatePlugin(accessorAccess(undefined, this.name));
});

registTemplatePlugin("this window global", function() {
	return this.name ?
		new SetVarMainTemplatePlugin(accessorAccess(this.target, this.name)) :
		new SetVarMainTemplatePlugin(this.target, true);
});

registTemplatePlugin("commonjs", function() {
	return this.name ?
		new SetVarMainTemplatePlugin(accessorAccess("exports", this.name)) :
		new SetVarMainTemplatePlugin("exports", true);
});

registTemplatePlugin("commonjs2", function() {
	return new SetVarMainTemplatePlugin("module.exports");
});

registTemplatePlugin("amd", function() {
	var AmdMainTemplatePlugin = require("./AmdMainTemplatePlugin");
	return new AmdMainTemplatePlugin(this.name);
});

registTemplatePlugin("umd umd2", function() {
	var UmdMainTemplatePlugin = require("./UmdMainTemplatePlugin");
	return new UmdMainTemplatePlugin(this.name, {
		optionalAmdExternalAsGlobal: this.target === "umd2",
		namedDefine: this.umdNamedDefine
	});
});

registTemplatePlugin("jsonp", function() {
	var JsonpExportMainTemplatePlugin = require("./JsonpExportMainTemplatePlugin");
	return new JsonpExportMainTemplatePlugin(this.name);
});

function registTemplatePlugin(targets, factory) {
	targets = targets.split(/\s+/);
	targets.forEach(function(target) {
		templatePlugins[target] = factory;
	});
}