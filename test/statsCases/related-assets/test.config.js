"use strict";

module.exports = {
	/**
	 * @param {import("../../../").MultiStats} stats stats
	 */
	validate(stats) {
		for (const item of stats.stats) {
			const json = item.toJson({ assets: true });

			for (const asset of json.assets) {
				if (asset.related) {
					expect(asset.related).toBeInstanceOf(Array);
				}
			}
		}
	}
};
