"use strict";

const PluginEnvironment = require("./PluginEnvironment");

/**
 * @this {EXPECTED_ANY}
 * @param {EXPECTED_ANY} Plugin plugin constructor
 * @returns {EXPECTED_ANY} recorded event bindings
 */
module.exports = function applyPluginWithOptions(Plugin) {
	const plugin = new (Function.prototype.bind.apply(
		Plugin,
		// eslint-disable-next-line prefer-rest-params
		/** @type {EXPECTED_ANY} */ (arguments)
	))();
	const pluginEnvironment = new PluginEnvironment();
	plugin.apply(pluginEnvironment.getEnvironmentStub());

	const env = this === global ? {} : this;
	env.plugin = plugin;
	env.pluginEnvironment = pluginEnvironment;

	return pluginEnvironment.getEventBindings();
};
