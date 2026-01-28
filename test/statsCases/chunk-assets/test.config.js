"use strict";

module.exports = {
	/**
	 * @param {import("../../../").Stats} stats stats
	 */
	validate(stats) {
		const _stats = stats.toJson({
			assets: true
		});
		let chunks;
		expect((chunks = Object.keys(_stats.assetsByChunkName))).toHaveLength(1);
		const chunk = chunks[0];
		expect(_stats.assetsByChunkName[chunk]).toHaveLength(2);
		expect(_stats.assetsByChunkName[chunk]).toEqual([
			"bundle.js",
			"bundle.js.map"
		]);
	}
};
