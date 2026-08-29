"use strict";

const NormalModule = require("../../../../lib/NormalModule");

/**
 * A minimal WebP container, so the emitted bytes are what the new extension
 * claims they are.
 * @param {Buffer} payload payload
 * @returns {Buffer} a RIFF/WEBP file carrying it
 */
function toWebp(payload) {
	// The RIFF form type, then the lossless chunk identifier.
	const header = Buffer.concat([Buffer.from("WEBP"), Buffer.from("VP8L")]);
	const size = Buffer.alloc(4);

	size.writeUInt32LE(header.length + payload.length, 0);

	return Buffer.concat([Buffer.from("RIFF"), size, header, payload]);
}

// The same rename across a hot update: each update re-encodes the new bytes
// and must emit them under the renamed asset.
class RenameToWebp {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RenameToWebp", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"RenameToWebp",
				async (result, module) => {
					if (!/\.jpg$/.test(module.resource)) return result;

					await Promise.resolve();

					/** @type {import("../../../../lib/asset/AssetModule").AssetModuleBuildInfo} */
					(module.buildInfo).assetResource = module.resource.replace(
						/\.jpg$/,
						".webp"
					);

					return [toWebp(Buffer.from(result[0])), result[1], result[2]];
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false
	},
	module: {
		generator: {
			asset: {
				filename: "assets/[name][ext]"
			}
		},
		rules: [
			{
				test: /\.(jpg|webp)$/,
				type: "asset/resource"
			}
		]
	},
	plugins: [new RenameToWebp()]
};
