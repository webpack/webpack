/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var OriginalSource = require("webpack-core/lib/OriginalSource");
var RawSource = require("webpack-core/lib/RawSource");
var WebpackMissingModule = require("./dependencies/WebpackMissingModule");
var sourceBuilders = {};

function ExternalModule(request, type) {
	Module.call(this);
	this.request = request;
	this.type = type;
	this.built = false;
}
module.exports = ExternalModule;

ExternalModule.registSourceBuilder = registSourceBuilder;

ExternalModule.prototype = Object.create(Module.prototype);

ExternalModule.prototype.external = true;

ExternalModule.prototype.identifier = function() {
	return "external " + JSON.stringify(this.request);
};

ExternalModule.prototype.readableIdentifier = function() {
	return "external " + JSON.stringify(this.request);
};

ExternalModule.prototype.needRebuild = function() {
	return false;
};

ExternalModule.prototype.build = function(options, compilation, resolver, fs, callback) {
	this.builtTime = new Date().getTime();
	callback();
};

ExternalModule.prototype.source = function() {
	var request = this.request;
	var type = this.type;
	if(typeof request === "object") request = request[type];
	if(!sourceBuilders.hasOwnProperty(type)) type = '*';
	var str = sourceBuilders[type].call(this, request);
	if(this.useSourceMap) {
		return new OriginalSource(str, this.identifier());
	} else {
		return new RawSource(str);
	}
};

ExternalModule.prototype.size = function() {
	return 42;
};

registSourceBuilder('this window global', function(request) {
	return Array.isArray(request) ?
		"(function() { module.exports = " + this.type + request.map(function(r) {
			return "[" + JSON.stringify(r) + "]";
		}).join("") + "; }());" :
		"(function() { module.exports = " + this.type + "[" + JSON.stringify(request) + "]; }());";
});

registSourceBuilder('commonjs commonjs2', function(request) {
	return Array.isArray(request) ?
		"module.exports = require(" + JSON.stringify(request[0]) + ")" + request.slice(1).map(function(r) {
			return "[" + JSON.stringify(r) + "]";
		}).join("") + ";" :
		"module.exports = require(" + JSON.stringify(request) + ");";
});

registSourceBuilder('amd umd umd2', function(request) {
	var str = "";
	if(this.optional) {
		str += "if(typeof __WEBPACK_EXTERNAL_MODULE_" + this.id + "__ === 'undefined') {" + WebpackMissingModule.moduleCode(request) + "}\n";
	}
	str += "module.exports = __WEBPACK_EXTERNAL_MODULE_" + this.id + "__;";
	return str;
});

registSourceBuilder('*', function(request) {
	var str = "";
	if(this.optional) {
		str += "if(typeof " + request + " === 'undefined') {" + WebpackMissingModule.moduleCode(request) + "}\n";
	}
	str += "module.exports = " + request + ";";
	return str;
});

function registSourceBuilder(types, builder) {
	types = types.split(/\s+/);
	types.forEach(function(type) {
		sourceBuilders[type] = builder;
	});
}
