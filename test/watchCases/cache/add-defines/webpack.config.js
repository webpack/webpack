const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	cache: {
		type: "memory"
	},
	plugins: [
		compiler => {
			const base = {
				DEFINE: "{}",
				RUN: DefinePlugin.runtimeValue(() => 3 - defines.length, [])
			};
			const defines = [
				{
					...base,
					"DEFINE.A": 0,
					"DEFINE.B": 2
				},
				{
					// change
					...base,
					"DEFINE.A": 1,
					"DEFINE.B": 2
				},
				{
					// add
					...base,
					"DEFINE.A": 1,
					"DEFINE.B": 2,
					"DEFINE.C": 3
				},
				{
					// remove
					...base,
					"DEFINE.A": 1,
					"DEFINE.C": 3
				}
			];
			compiler.hooks.compilation.tap("webpack.config", (...args) => {
				const plugin = new DefinePlugin(defines.shift());
				plugin.apply(
					/** @type {any} */ ({
						hooks: {
							compilation: {
								tap: (name, fn) => {
									fn(...args);
								}
							}
						}
					})
				);
			});
		}
	]
};
