it("should work", () => {
	const stats = __STATS__.children[__STATS_I__];

	const test = stats.assets.find(
		a => a.name === "test.js"
	);
	expect(Boolean(test)).toBe(true);

	const assetEntry = stats.assets.find(
		a => a.info.sourceFilename === "../_images/file.png"
	);
	expect(Boolean(assetEntry)).toBe(true);

	switch (__STATS_I__) {
		case 0: {
			expect(stats.assets.length).toBe(2);
			break;
		}
		case 1: {
			expect(stats.assets.length).toBe(3);

			const jsEntry = stats.assets.find(
				a => a.name.endsWith("js-entry.js")
			);
			expect(Boolean(jsEntry)).toBe(true);
			break;
		}
		case 2: {
			expect(stats.assets.length).toBe(4);

			const cssEntryInJs = stats.assets.find(
				a => a.name.endsWith("css-entry.js")
			);
			expect(Boolean(cssEntryInJs)).toBe(true);

			const cssEntry = stats.assets.find(
				a => a.name.endsWith("css-entry.css")
			);
			expect(Boolean(cssEntry)).toBe(true);
			break;
		}
		case 3: {
			expect(stats.assets.length).toBe(5);

			const jsEntry = stats.assets.find(
				a => a.name.endsWith("js-entry.js")
			);
			expect(Boolean(jsEntry)).toBe(true);

			const cssEntryInJs = stats.assets.find(
				a => a.name.endsWith("css-entry.js")
			);
			expect(Boolean(cssEntryInJs)).toBe(true);

			const cssEntry = stats.assets.find(
				a => a.name.endsWith("css-entry.css")
			);
			expect(Boolean(cssEntry)).toBe(true);
			break;
		}
		case 4: {
			expect(stats.assets.length).toBe(4);

			const jsEntry = stats.assets.find(
				a => a.name.endsWith("js-entry.js")
			);
			expect(Boolean(jsEntry)).toBe(true);

			const cssEntryInJs = stats.assets.find(
				a => a.name.endsWith("css-entry.js")
			);
			expect(Boolean(cssEntryInJs)).toBe(true);
			break;
		}
		case 5: {
			expect(stats.assets.length).toBe(3);

			const jsEntry = stats.assets.find(
				a => a.name.endsWith("mixed-entry.js")
			);
			expect(Boolean(jsEntry)).toBe(true);

			break;
		}
		case 6: {
			expect(stats.assets.length).toBe(3);

			const jsEntry = stats.assets.find(
				a => a.name.endsWith("mixed-entry.js")
			);
			expect(Boolean(jsEntry)).toBe(true);

			break;
		}
	}
});
