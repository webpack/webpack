import value from "./value";

// Step 1 fails, so the bundle running then is still the one step 0 emitted
it("should keep the last emitted bundle while a rebuild has errors", () => {
	const bundle = STATS_JSON.assets.find((asset) => asset.name === "bundle.js");
	expect(bundle.emitted).toBe(WATCH_STEP !== "1");
	expect(value).toBe(WATCH_STEP === "1" ? "0" : WATCH_STEP);
});
