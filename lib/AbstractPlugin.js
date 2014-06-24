/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function AbstractPlugin(plugins) {
	this._plugins = plugins || {};
};
module.exports = AbstractPlugin;

AbstractPlugin.create = function(plugins) {
	function Plugin() {
		AbstractPlugin.call(this, plugins)
	}
	Plugin.prototype = Object.create(AbstractPlugin.prototype);
	return Plugin;
};

AbstractPlugin.prototype.apply = function(object) {
	for(var name in this._plugins) {
		object.plugin(name, this._plugins[name]);
	}
};
