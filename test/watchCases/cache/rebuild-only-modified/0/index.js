import c from "./c";

const moduleNamed = (name) =>
	STATS_JSON.modules.find((module) => module.name === name);

it("should rebuild only the module whose file changed", () => {
	// Step 1 rewrites a.js with the same text, step 2 changes it.
	expect(moduleNamed("./a.js").built).toBe(true);
	expect(moduleNamed("./c.js").built).toBe(WATCH_STEP === "0");
	expect(c()).toBe(
		WATCH_STEP === "2" ? "This is a MODIFIED via c" : "This is a via c"
	);
});

it("should emit the bundle only when its content changed", () => {
	const bundle = STATS_JSON.assets.find((asset) => asset.name === "bundle.js");
	expect(bundle.emitted).toBe(WATCH_STEP !== "1");
});
