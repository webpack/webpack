"use strict";

const NormalModule = require("../../../../lib/NormalModule");
const { parseResource } = require("../../../../lib/util/identifier");

// A request carries its query and fragment into the asset's name, so a rename
// has to keep them: only the extension is the encoder's to change.
class RenameKeepingQuery {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RenameKeepingQuery", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"RenameKeepingQuery",
				async (result, module) => {
					if (!/\.png/.test(module.resource)) return result;

					const {
						path: file,
						query,
						fragment
					} = parseResource(module.resource);

					/** @type {import("../../../../lib/asset/AssetModule").AssetModuleBuildInfo} */
					(module.buildInfo).assetResource = `${file.replace(
						/\.png$/,
						".webp"
					)}${query}${fragment}`;

					return [Buffer.from("webp-bytes"), result[1], result[2]];
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "[name][ext][query][fragment]"
	},
	module: {
		rules: [
			{
				test: /\.(png|webp)/,
				type: "asset/resource"
			},
			{
				test: /\.(png|webp)/,
				resourceQuery: /inline/,
				type: "asset/inline"
			},
			{
				test: /\.(png|webp)/,
				resourceFragment: /inline/,
				type: "asset/inline"
			}
		]
	},
	plugins: [new RenameKeepingQuery()]
};
