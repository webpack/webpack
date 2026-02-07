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
			// CSS-only entry should NOT generate an empty .js file (#11671)
			expect(stats.assets.length).toBe(3);

			const cssEntryInJs = stats.assets.find(
				a => a.name.endsWith("css-entry.js")
			);
			expect(Boolean(cssEntryInJs)).toBe(false);

			const cssEntry = stats.assets.find(
				a => a.name.endsWith("css-entry.css")
			);
			expect(Boolean(cssEntry)).toBe(true);
			break;
		}
		case 3: {
			// JS entry keeps .js, CSS-only entry should NOT generate .js (#11671)
			expect(stats.assets.length).toBe(4);

			const jsEntry = stats.assets.find(
				a => a.name.endsWith("js-entry.js")
			);
			expect(Boolean(jsEntry)).toBe(true);

			const cssEntryInJs = stats.assets.find(
				a => a.name.endsWith("css-entry.js")
			);
			expect(Boolean(cssEntryInJs)).toBe(false);

			const cssEntry = stats.assets.find(
				a => a.name.endsWith("css-entry.css")
			);
			expect(Boolean(cssEntry)).toBe(true);
			break;
		}
		case 4: {
			// Node target: CSS entry generates JS (exports class names, no CSS output)
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
