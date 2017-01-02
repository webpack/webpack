function PluginEnvironment() {
	var events = [];

	this.getCompilerStub = function() {
		return {
			plugin: function(name, handler) {
				events.push({
					name,
					handler
				});
			}
		};
	};

	this.getEventBindings = function() {
		return events;
	};
}

module.exports = function applyPluginWithOptions(Plugin, options) {
	var plugin = new Plugin(options);
	var pluginEnvironment = new PluginEnvironment();
	plugin.apply(pluginEnvironment.getCompilerStub());
	return pluginEnvironment.getEventBindings();
};
