require("./warning-loader!./changing-file");

it("should detect a change on warnings change", function() {
	switch(WATCH_STEP) {
		case "0":
			STATE.hash = STATS_JSON.hash;
			break;
		case "1":
			STATS_JSON.hash.should.be.not.eql(STATE.hash);
			break;
	}
});
