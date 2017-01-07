var PluginEnvironment = require('./PluginEnvironment');

module.exports = function applyPluginWithOptions(Plugin) {
	var plugin = new (Function.prototype.bind.apply(Plugin, arguments));
	var pluginEnvironment = new PluginEnvironment();
	plugin.apply(pluginEnvironment.getEnvironmentStub());
	return pluginEnvironment.getEventBindings();
};
