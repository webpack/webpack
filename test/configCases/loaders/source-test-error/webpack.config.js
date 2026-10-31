"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /plain\.js$/,
				use: [
					{
						loader: "./sync-loader.js",
						// Compiling the rule probes it with "", so only real input throws.
						sourceTest: /** @type {(source: string) => boolean} */ (
							(source) => {
								if (source) throw new Error("source test failed");
								return false;
							}
						)
					},
					// Returns synchronously, so the source test runs inside its callback.
					"./sync-loader.js"
				]
			},
			{
				test: /plain-null\.js$/,
				use: [
					{
						loader: "./sync-loader.js",
						sourceTest: /** @type {(source: string) => boolean} */ (
							(source) => {
								// eslint-disable-next-line no-throw-literal
								if (source) throw null;
								return false;
							}
						)
					},
					"./sync-loader.js"
				]
			},
			{
				test: /plain-symbol\.js$/,
				use: [
					{
						loader: "./sync-loader.js",
						sourceTest: /** @type {(source: string) => boolean} */ (
							(source) => {
								if (source) throw Symbol("odd");
								return false;
							}
						)
					},
					"./sync-loader.js"
				]
			}
		]
	}
};
