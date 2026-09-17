"use strict";

/** @import { Compilation } from "../../../../" */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	entry: { main: "./index.ts" },
	ignoreWarnings: [
		(warning) => {
			// when using swc-loader or `transpileOnly: true` with ts-loader, the warning is expected
			expect(warning.message).toMatch(
				/export 'T' \(reexported as '(T|NamedT)'\) was not found in '\.\/(re-export|export)' \(possible exports: value\)/
			);
			return true;
		}
	],
	output: {
		module: true,
		library: {
			type: "module"
		},
		chunkFormat: "module"
	},
	resolve: {
		extensions: [".ts"]
	},
	optimization: {
		concatenateModules: true
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			},
			{
				type: "asset/inline",
				test: /\.png$/
			}
		]
	},
	plugins: [
		function apply() {
			/**
			 * @param {Compilation} compilation compilation
			 */
			const handler = (compilation) => {
				compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
					const source = assets["bundle0.mjs"].source();
					expect(source).toContain(
						"export { file_namespaceObject as logo, value };"
					);
					// `NamedT` crosses a named re-export, which is marked provided itself:
					// only the end of the chain says the erased type is missing
					expect(source).not.toMatch(/^export .*\b(T|NamedT)\b/m);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
