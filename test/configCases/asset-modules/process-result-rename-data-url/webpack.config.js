"use strict";

const NormalModule = require("../../../../lib/NormalModule");

// A module read from a `data:` URI carries its own media type. Once a tap
// re-encodes it, that type describes what was read, not what is emitted.
class RenameOnProcessResult {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RenameOnProcessResult", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"RenameOnProcessResult",
				async (result, module) => {
					if (!/^data:image\/png/.test(module.resource)) return result;
					await Promise.resolve();
					/** @type {import("../../../../lib/asset/AssetModule").AssetModuleBuildInfo} */
					(module.buildInfo).assetResource = "rewritten.webp";
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
				mimetype: "image/png",
				type: "asset/inline"
			}
		]
	},
	plugins: [new RenameOnProcessResult()]
};
