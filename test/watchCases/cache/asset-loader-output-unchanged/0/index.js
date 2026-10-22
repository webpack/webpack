import svg from "./file.svg";

it("should not re-emit anything when a changed file gives the same loader output", () => {
	expect(svg).toMatch(/\.svg$/);
	const emitted = (test) =>
		STATS_JSON.assets.find((asset) => test.test(asset.name)).emitted;
	// Step 1 edits the svg; the loader ignores what it says.
	expect(emitted(/^bundle\.js$/)).toBe(WATCH_STEP === "0");
	expect(emitted(/\.svg$/)).toBe(WATCH_STEP === "0");
	if (WATCH_STEP === "1") {
		const svgModule = STATS_JSON.modules.find((m) => /file\.svg$/.test(m.name));
		expect(svgModule.built).toBe(true);
	}
});
