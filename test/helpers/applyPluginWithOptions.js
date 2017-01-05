var PluginEnvironment = require('./PluginEnvironment');

module.exports = function applyPluginWithOptions(Plugin, options) {
	var plugin = new Plugin(options);
	var pluginEnvironment = new PluginEnvironment();
	plugin.apply(pluginEnvironment.getEnvironmentStub());
	return pluginEnvironment.getEventBindings();
};
