"use strict";

const NormalModule = require("../../../../lib/NormalModule");

// An image minimizer's shape: it awaits, and re-encodes the asset as another
// format, so the name it is emitted under has to change with the bytes.
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
					// Nothing here needs to wait; awaiting is what the sync hook
					// could not do, so the case is only meaningful if it does.
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
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|webp)$/,
				type: "asset/resource"
			}
		]
	},
	plugins: [new RenameOnProcessResult()]
};
