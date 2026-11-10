"use strict";

/** @type {string[]} */
const events = [];
/** @type {{ applied: number, thisIsCompiler: boolean, optionsPlugins: boolean }} */
const state = { applied: 0, thisIsCompiler: false, optionsPlugins: false };

class MultiCompilerRecorderPlugin {
	/**
	 * @param {import("../../../../").MultiCompiler} compiler the multi compiler
	 * @returns {void}
	 */
	apply(compiler) {
		state.applied++;
		compiler.hooks.watchRun.tap(
			"MultiCompilerRecorderPlugin",
			/**
			 * @param {import("../../../../").Compiler} child the child compiler starting
			 */
			(child) => {
				events.push(`watchRun ${child.name}`);
			}
		);
		compiler.hooks.done.tap("MultiCompilerRecorderPlugin", (stats, changed) => {
			events.push(
				`done ${stats.stats.length} ${changed.map((c) => c.name).join(",")}`
			);
		});
	}
}

/** @type {import("../../../../").MultiCompilerPluginFunction} */
function recordThis(compiler) {
	state.thisIsCompiler = this === compiler && compiler.compilers.length === 2;
	state.optionsPlugins = compiler.options.plugins === plugins;
}

/** @type {import("../../../../").MultiCompilerOptions["plugins"]} */
const plugins = [new MultiCompilerRecorderPlugin(), recordThis, false, null];

/** @type {import("../../../../").MultiConfiguration} */
module.exports = Object.assign(
	[
		{
			name: "a",
			entry: "./index.js",
			output: { clean: false, filename: "bundle.js" }
		},
		{
			name: "b",
			entry: "./b.js",
			output: { clean: false, filename: "b-bundle.js" }
		}
	],
	{
		plugins,
		events,
		state
	}
);
