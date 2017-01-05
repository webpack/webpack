import "./style.css"
import x from "./script"

it("should handle css changes", function() {
	switch(WATCH_STEP) {
		case "0":
			STATE.first = STATS_JSON.hash;
			break;
		case "1":
			STATE.second = STATS_JSON.hash;
			STATS_JSON.hash.should.not.be.eql(STATE.first, "stats hash should have changed, but didn't");
			break;
		case "2":
			throw new Error("noop css change should not trigger update")
			break;
		case "3":
			throw new Error("noop js change should not trigger update")
			break;
	}
});
