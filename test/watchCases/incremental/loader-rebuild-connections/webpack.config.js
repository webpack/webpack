"use strict";

/** @type {number | undefined} */
let firstCount;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /target\.js$/,
				use: require.resolve("./loader")
			}
		]
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("ConnectionCount", (stats) => {
					const compilation = stats.compilation;
					for (const module of compilation.modules) {
						if (!/target\.js/.test(module.identifier())) continue;
						const count = [
							...compilation.moduleGraph.getIncomingConnections(module)
						].length;
						if (firstCount === undefined) {
							firstCount = count;
						} else if (count > firstCount) {
							throw new Error(
								`incoming connections grew across rebuilds: ${firstCount} -> ${count}`
							);
						}
					}
				});
			}
		}
	]
};
