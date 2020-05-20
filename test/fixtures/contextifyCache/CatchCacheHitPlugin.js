const {RawSource} = require('webpack-sources');

class CatchCacheHitPlugin {
	constructor(catchFiles) {
		/**
		 * @type {Map<RegExp, string>}
		 */
		this.catchFiles = catchFiles;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("CatchCacheHitPlugin", compilation => {
			const cacheHit = new Set();

			compilation.cache.hooks.get.tap(
				{ name: "CatchCacheHitPlugin", stage: -20 },
				(identifier, etag, gotHandlers) => {
					let removeKey;
					let val;
					for (const [regex, value] of this.catchFiles) {
						if (identifier.match(regex)) {
							val = value;
							removeKey = regex;
							break;
						}
					}

					if (removeKey) this.catchFiles.delete(removeKey);

					if (val) {
						gotHandlers.push((result, callback) => {
							if (result === undefined) return callback();

							cacheHit.add(val);

							return callback();
						});
					}
				}
			);

			compilation.hooks.additionalAssets.tap(
				"CatchCacheHitPlugin",
				() => compilation.emitAsset(
					'cacheHit.js',
					new RawSource(`module.exports = new Set(${JSON.stringify(Array.from(cacheHit))})`)
				)
			);
		});
	}
}

module.exports = CatchCacheHitPlugin;
