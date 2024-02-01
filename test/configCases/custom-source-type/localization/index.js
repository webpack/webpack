it("should generate the correct output files", () => {
	// It should not generate a JS chunk file for the localization-only chunk
	expect(
		__STATS__.children[INDEX].assets.map(asset => asset.name).sort()
	).toEqual(
		[
			NORMAL1 && `286.bundle${INDEX}.js`,
			NORMAL2 && `678.bundle${INDEX}.js`,
			`bundle${INDEX}.js`,
			"localization-248.js",
			NORMAL1 && "localization-286.js",
			NORMAL2 && "localization-678.js",
			CONTENT2 && "localization-702.js"
		].filter(Boolean)
	);
});

it("should load a chunk with only the custom source type", () => {
	return import("./content.loc").then(({ default: content }) => {
		expect(content).toEqual({
			value: "Translated text"
		});
	});
});

if (CONTENT2) {
	it("should load a chunk with only the custom source type", () => {
		return import("./content2.loc").then(({ default: content }) => {
			expect(content).toEqual({
				value: "Translated text 2"
			});
		});
	});
}

if (NORMAL1) {
	it("should still load normal chunks", () => {
		if (TARGET === "web") {
			Promise.resolve().then(() => {
				__non_webpack_require__(`./286.bundle${INDEX}.js`);
			});
		}

		return import("./normal.js").then(({ default: value }) => {
			expect(value).toBe(42);
		});
	});
}

if (NORMAL2) {
	it("should still another load normal chunks", () => {
		if (TARGET === "web") {
			Promise.resolve().then(() => {
				__non_webpack_require__(`./678.bundle${INDEX}.js`);
			});
		}

		return import("./normal2.js").then(({ default: value }) => {
			expect(value).toBe(43);
		});
	});
}
