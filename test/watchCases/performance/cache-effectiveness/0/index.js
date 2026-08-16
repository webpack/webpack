require("./changing-file");

it("should report only when modules were reused", () => {
	switch (WATCH_STEP) {
		case "0":
			// A cold build rebuilds everything, so there is nothing to report.
			expect(STATS_JSON.warnings).toHaveLength(0);
			break;
		case "1":
			expect(STATS_JSON.warnings).toHaveLength(1);
			expect(STATS_JSON.warnings[0].message).toMatch(
				/1 of 2 modules were rebuilt although the cache was warm/
			);
			break;
	}
});
