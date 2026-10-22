const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should re-emit only the asset whose chunk changed", () => {
	const emitted = (name) =>
		STATS_JSON.assets.find((asset) => asset.name === name).emitted;
	// Step 1 changes only entry2.js, so this bundle's bannered asset is reused.
	expect(emitted("bundle.js")).toBe(WATCH_STEP === "0");
	expect(emitted("entry2.js")).toBe(true);
	const bundle = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	expect(bundle.split("\n")[0]).toBe("/*! banner is a string */");
});
