require("./changing-file")
it("should watch for changes", function() {
	switch(WATCH_STEP) {
		case "0":
			STATS_JSON.children.should.have.size(2);
			break;
		case "1":
			STATS_JSON.children.should.have.size(1);
			break;
	}
})
