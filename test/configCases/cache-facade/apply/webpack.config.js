"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		(compiler) => {
			// taken before the output defaults set `output.hashFunction`
			const cache = compiler.getCache("CacheFacadeApply");
			compiler.hooks.thisCompilation.tap("CacheFacadeApply", (compilation) => {
				compilation.hooks.processAssets.tap("CacheFacadeApply", () => {
					const etag = String(
						cache.getLazyHashedEtag({ updateHash: (hash) => hash.update("a") })
					);
					const expected = /** @type {string} */ (
						compiler.webpack.util
							.createHash(
								/** @type {Parameters<typeof compiler.webpack.util.createHash>[0]} */ (
									compilation.outputOptions.hashFunction
								)
							)
							.update("a")
							.digest("base64")
					);
					compilation.emitAsset(
						"etag.json",
						new compiler.webpack.sources.RawSource(
							JSON.stringify({ etag, expected })
						)
					);
				});
			});
		}
	]
};
