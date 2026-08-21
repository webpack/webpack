/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} SlowPluginDetails
 * @property {string} name the plugin, as it named itself when tapping
 * @property {number} ms milliseconds it held the main thread
 * @property {number} calls how many of its taps ran
 */

class SlowPluginsWarning extends WebpackError {
	/**
	 * Creates an instance of SlowPluginsWarning.
	 * @param {SlowPluginDetails[]} plugins the worst offenders, slowest first
	 * @param {number} total how many plugins are over the threshold in all
	 */
	constructor(plugins, total) {
		const list = plugins
			.map(
				(plugin) =>
					`\n  ${plugin.name} (${Math.round(plugin.ms)} ms over ${plugin.calls} ${
						plugin.calls === 1 ? "call" : "calls"
					})`
			)
			.join("");

		super(
			`slow plugins: ${total} ${total === 1 ? "plugin holds" : "plugins hold"} the main thread long enough to be worth looking at:${list}\nThis is the time each one spent running its own code, with anything it called out to counted against that instead — so it is what the plugin itself costs, not what it waited for. 'ProfilingPlugin' records the same work as a trace when the ordering matters.\nFor more info visit https://webpack.js.org/plugins/profiling-plugin/`
		);

		/** @type {string} */
		this.name = "SlowPluginsWarning";
	}
}

module.exports = SlowPluginsWarning;
