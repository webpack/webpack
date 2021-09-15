require("./changing-file")
it("should watch for changes", function() {
	switch(WATCH_STEP) {
		case "0":
			expect(STATS_JSON.children).toHaveLength(2);
			break;
		case "1":
			expect(STATS_JSON.children).toHaveLength(1);
			break;
	}
})
