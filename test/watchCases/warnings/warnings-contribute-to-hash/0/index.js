require("./warning-loader!./changing-file");

it("should detect a change on warnings change", function() {
	switch(WATCH_STEP) {
		case "0":
			STATE.hash = STATS_JSON.hash;
			break;
		case "1":
			expect(STATS_JSON.hash).not.toBe(STATE.hash);
			break;
	}
});
