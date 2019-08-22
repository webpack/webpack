var PluginEnvironment = require("./PluginEnvironment");

module.exports = function TemplatePluginEnvironment() {
	var events = [];
	var mainTemplatePluginEnvironment = new PluginEnvironment();

	this.getEnvironmentStub = function() {
		return {
			mainTemplate: mainTemplatePluginEnvironment.getEnvironmentStub(),
			templatesPlugin: function(name, handler) {
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

	this.getMainTemplateBindings = function() {
		return mainTemplatePluginEnvironment.getEventBindings();
	};
};
