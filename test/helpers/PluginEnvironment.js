module.exports = function PluginEnvironment() {
	var events = [];

	this.getEnvironmentStub = function() {
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
};
