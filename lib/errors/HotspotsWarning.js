/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} HotspotDetails
 * @property {"loader" | "plugin"} kind what the name refers to
 * @property {string} name the loader or plugin, as it identified itself
 * @property {number} ms milliseconds it held the main thread
 * @property {number} runs how many times it ran
 */

/**
 * @typedef {object} HookDetails
 * @property {string} name the hook
 * @property {number} ms milliseconds its taps held the main thread
 */

class HotspotsWarning extends WebpackError {
	/**
	 * Creates an instance of HotspotsWarning.
	 * @param {HotspotDetails[]} hotspots the worst offenders, slowest first
	 * @param {number} total how many are over the threshold in all
	 * @param {HookDetails[]} hooks the same time grouped by hook instead
	 */
	constructor(hotspots, total, hooks) {
		const list = hotspots
			.map(
				(hotspot) =>
					`\n  ${hotspot.kind} ${hotspot.name} (${Math.round(hotspot.ms)} ms over ${
						hotspot.runs
					} ${hotspot.runs === 1 ? "run" : "runs"})`
			)
			.join("");

		const byHook =
			hooks.length > 0
				? `\nThe same time, grouped by the hook it ran under:${hooks
						.map((hook) => `\n  ${hook.name} (${Math.round(hook.ms)} ms)`)
						.join("")}`
				: "";

		super(
			`hotspots: ${total} ${total === 1 ? "thing holds" : "things hold"} the main thread long enough to be worth looking at:${list}${byHook}\nThis is the time each one held the main thread itself, with anything it called out to charged to that instead — so it is what the loader or plugin costs, not what it waited for. Only synchronous stretches count, so work resumed after an await is missing from it. 'ProfilingPlugin' records the same work as a trace when the ordering matters.\nFor more info visit https://webpack.js.org/plugins/profiling-plugin/`
		);

		/** @type {string} */
		this.name = "HotspotsWarning";
	}
}

module.exports = HotspotsWarning;
