import "./changing";

it("should drop a deleted optional module from the graph", () => {
	try {
		require("./target");
	} catch (_err) {
		// optional
	}
	const names = STATS_JSON.modules.map((m) => m.name);
	if (WATCH_STEP !== "0") {
		expect(names.filter((n) => /target\.js$/.test(n))).toHaveLength(0);
	}
});
