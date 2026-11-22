"use strict";

/** @typedef {import("../../../../types").Configuration} Configuration */

/**
 * Returns the configuration for one option under test.
 * @param {number} index the configuration index
 * @param {Configuration} options the options under test
 * @returns {Configuration} configuration
 */
const config = (index, options) => ({
	mode: "production",
	target: "node",
	entry: { [`bundle${index}`]: `./index-${index}.js` },
	stats: { optimizationBailout: true },
	...options,
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: `[name]-${index}.mjs`,
		...options.output
	},
	optimization: {
		minimize: false,
		concatenateModules: { crossChunkImports: true },
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /[\\/]shared[\\/]/,
					name: `shared-${index}`,
					chunks: "async",
					minChunks: 2,
					minSize: 0,
					enforce: true
				}
			}
		}
	}
});

module.exports = [
	config(0, {
		experiments: { deferImport: true },
		plugins: [
			(compiler) => {
				compiler.hooks.compilation.tap("AdditionalSeal", (compilation) => {
					let sealed = false;
					// a second seal keeps the module graph and its bailouts
					compilation.hooks.needAdditionalSeal.tap("AdditionalSeal", () => {
						if (sealed) return;
						sealed = true;
						return true;
					});
				});
			}
		]
	}),
	config(1, { output: { strictModuleExceptionHandling: true } }),
	config(2, { output: { environment: { symbol: false } } })
];
