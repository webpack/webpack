"use strict";

/**
 * @param {string} name name of the chunk group and of its one asset
 * @returns {Record<string, unknown>} the group as `chunkGroups: true` reports it
 */
const chunkGroup = (name) => ({
	name,
	chunks: undefined,
	assets: [{ name: `${name}.js`, size: expect.any(Number) }],
	filteredAssets: 0,
	assetsSize: expect.any(Number),
	auxiliaryAssets: undefined,
	filteredAuxiliaryAssets: 0,
	auxiliaryAssetsSize: 0,
	children: undefined,
	childAssets: undefined
});

/**
 * @param {string} name name of the chunk and of its asset
 * @returns {Record<string, unknown>} the asset as `assets: true` reports it
 */
const asset = (name) => ({
	type: "asset",
	name: `${name}.js`,
	size: expect.any(Number),
	emitted: true,
	comparedForEmit: false,
	cached: false,
	info: { javascriptModule: false, size: expect.any(Number) },
	chunkNames: [name],
	chunkIdHints: [],
	auxiliaryChunkNames: [],
	auxiliaryChunkIdHints: [],
	filteredRelated: undefined
});

module.exports = {
	/**
	 * @param {import("../../../").Stats} stats stats
	 */
	validate(stats) {
		for (const value of [false, "none"]) {
			expect(stats.toJson(value)).toStrictEqual({});
			expect(stats.toString(value)).toBe("");
		}
		expect(stats.toJson({ all: false })).toStrictEqual({});

		// the loader's warning is raised, then dropped by `ignoreWarnings`
		expect(stats.compilation.warnings).toHaveLength(1);
		expect(stats.hasWarnings()).toBe(false);
		expect(
			stats.toJson({
				all: false,
				version: false,
				errorsCount: true,
				warningsCount: true
			})
		).toStrictEqual({ errorsCount: 0, warningsCount: 0 });

		const groups = stats.toJson({
			all: false,
			errorsCount: true,
			chunkGroups: true
		});
		// `namedChunkGroups` has no prototype, which `toStrictEqual` would compare
		expect({
			...groups,
			namedChunkGroups: { ...groups.namedChunkGroups }
		}).toStrictEqual({
			errorsCount: 0,
			namedChunkGroups: {
				entryA: chunkGroup("entryA"),
				entryB: chunkGroup("entryB"),
				chunkB: chunkGroup("chunkB")
			}
		});

		expect(
			stats.toJson({ all: false, errorsCount: true, assets: true })
		).toStrictEqual({
			assets: [asset("entryB"), asset("entryA"), asset("chunkB")],
			assetsByChunkName: {
				entryA: ["entryA.js"],
				entryB: ["entryB.js"],
				chunkB: ["chunkB.js"]
			},
			errorsCount: 0,
			filteredAssets: undefined
		});
	}
};
