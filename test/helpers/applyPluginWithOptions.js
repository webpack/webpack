"use strict";

const PluginEnvironment = require("./PluginEnvironment");

/** @typedef {{ apply: (env: unknown) => void }} PluginInstance */

/**
 * @this {Record<string, unknown> | typeof globalThis}
 * @param {new (...args: unknown[]) => PluginInstance} Plugin plugin constructor
 * @param {...unknown} args constructor arguments
 * @returns {{ name: string, handler: (...args: unknown[]) => unknown }[]} recorded event bindings
 */
module.exports = function applyPluginWithOptions(Plugin, ...args) {
	const plugin = new Plugin(...args);
	const pluginEnvironment = new PluginEnvironment();
	plugin.apply(pluginEnvironment.getEnvironmentStub());

	const env = /** @type {Record<string, unknown>} */ (
		this === globalThis ? {} : this
	);
	env.plugin = plugin;
	env.pluginEnvironment = pluginEnvironment;

	return pluginEnvironment.getEventBindings();
};
