import "./changing";

it("should not re-run an importer whose optional dependency never resolves", () => {
	try {
		require("missing-pkg");
	} catch (_err) {
		// optional
	}
	// only the initial build should have run the loader for this module
	expect(LOADER_RUNS).toBe(1);
});
