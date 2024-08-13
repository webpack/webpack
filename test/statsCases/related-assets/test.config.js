module.exports = {
	validate(stats) {
		for (const item of stats.stats) {
			const json = item.toJson({ assets: true });

			for (const asset of json.assets) {
				expect(asset.related).toBeInstanceOf(Array);
			}
		}
	}
};
