module.exports = {
	validate(stats) {
		for (let i = 0; i < 4; i += 2) {
			const a = stats.stats[i + 0].toJson({
				assets: true
			});
			const b = stats.stats[i + 1].toJson({
				assets: true
			});
			expect(Object.keys(a.assetsByChunkName).length).toBe(3);
			expect(a.assetsByChunkName.main).toEqual(b.assetsByChunkName.main);
			expect(a.assetsByChunkName.lazy).toEqual(b.assetsByChunkName.lazy);
		}
	}
};
