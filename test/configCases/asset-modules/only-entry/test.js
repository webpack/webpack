it("should work", () => {
	const stats = __STATS__.children[__STATS_I__];

	if (__STATS_I__ === 0) {
		expect(stats.assets.length).toBe(2);

		const assetEntry = stats.assets.find(
			a => a.info.sourceFilename === "../_images/file.png"
		);
		expect(Boolean(assetEntry)).toBe(true);

		const test = stats.assets.find(
			a => a.name === "test.js"
		);
		expect(Boolean(test)).toBe(true);
	} else if (__STATS_I__ === 1) {
		expect(stats.assets.length).toBe(3);

		const assetEntry = stats.assets.find(
			a => a.info.sourceFilename === "../_images/file.png"
		);
		expect(Boolean(assetEntry)).toBe(true);

		const test = stats.assets.find(
			a => a.name === "test.js"
		);
		expect(Boolean(test)).toBe(true);

		const jsEntry = stats.assets.find(
			a => a.name.endsWith("js-entry.js")
		);
		expect(Boolean(jsEntry)).toBe(true);
	} else if (__STATS_I__ === 2) {
		expect(stats.assets.length).toBe(3);

		const assetEntry = stats.assets.find(
			a => a.info.sourceFilename === "../_images/file.png"
		);
		expect(Boolean(assetEntry)).toBe(true);

		const test = stats.assets.find(
			a => a.name === "test.js"
		);
		expect(Boolean(test)).toBe(true);

		const cssEntry = stats.assets.find(
			a => a.name.endsWith("css-entry.js")
		);
		expect(Boolean(cssEntry)).toBe(true);
	} else if (__STATS_I__ === 3) {
		expect(stats.assets.length).toBe(4);

		const assetEntry = stats.assets.find(
			a => a.info.sourceFilename === "../_images/file.png"
		);
		expect(Boolean(assetEntry)).toBe(true);

		const test = stats.assets.find(
			a => a.name === "test.js"
		);
		expect(Boolean(test)).toBe(true);

		const jsEntry = stats.assets.find(
			a => a.name.endsWith("js-entry.js")
		);
		expect(Boolean(jsEntry)).toBe(true);

		const cssEntry = stats.assets.find(
			a => a.name.endsWith("css-entry.js")
		);
		expect(Boolean(cssEntry)).toBe(true);
	}
});
