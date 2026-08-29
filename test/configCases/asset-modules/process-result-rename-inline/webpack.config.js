"use strict";

const NormalModule = require("../../../../lib/NormalModule");

// The inline half: there is no file name to change, but the media type makes
// the same claim about the bytes, so it has to follow too.
class RenameOnProcessResult {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RenameOnProcessResult", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"RenameOnProcessResult",
				async (result, module) => {
					if (!/\.png$/.test(module.resource)) return result;
					await Promise.resolve();
					/** @type {import("../../../../lib/asset/AssetModule").AssetModuleBuildInfo} */
					(module.buildInfo).assetResource = module.resource.replace(
						/\.png$/,
						".webp"
					);
					return [Buffer.from("webp-bytes"), result[1], result[2]];
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|webp)$/,
				type: "asset/inline"
			}
		]
	},
	plugins: [new RenameOnProcessResult()]
};
