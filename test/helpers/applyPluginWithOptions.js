const PluginEnvironment = require("./PluginEnvironment");

module.exports = function applyPluginWithOptions(Plugin) {
	// eslint-disable-next-line prefer-rest-params
	const plugin = new (Function.prototype.bind.apply(Plugin, arguments))();
	const pluginEnvironment = new PluginEnvironment();
	plugin.apply(pluginEnvironment.getEnvironmentStub());

	const env = this === global ? {} : this;
	env.plugin = plugin;
	env.pluginEnvironment = pluginEnvironment;

	return pluginEnvironment.getEventBindings();
};
