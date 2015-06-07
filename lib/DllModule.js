/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Module = require("./Module");
var RawSource = require("webpack-core/lib/RawSource");

function DllModule(context, dependencies, name, type) {
	Module.call(this);
	this.context = context;
	this.dependencies = dependencies;
	this.name = name;
	this.built = false;
	this.cacheable = true;
	this.type = type;
}
module.exports = DllModule;

DllModule.prototype = Object.create(Module.prototype);

DllModule.prototype.identifier = function() {
	return "dll " + this.name;
};

DllModule.prototype.readableIdentifier = function() {
	return "dll " + this.name;
};

DllModule.prototype.disconnect = function disconnect() {
	this.built = false;
	Module.prototype.disconnect.call(this);
};

DllModule.prototype.build = function build(options, compilation, resolver, fs, callback) {
	this.built = true;
	return callback();
};

DllModule.prototype.source = function() {
	return new RawSource("module.exports = __webpack_require__;");
};

DllModule.prototype.needRebuild = function needRebuild() {
	return false;
};

DllModule.prototype.size = function() {
	return 12;
};

DllModule.prototype.updateHash = function(hash) {
	hash.update("dll module");
	hash.update(this.name || "");
	Module.prototype.updateHash.call(this, hash);
};
