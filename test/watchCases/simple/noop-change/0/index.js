import "./noop-changing-file.js"
import "./changing-file.js"

it("should ignore change", function() {
	switch(WATCH_STEP) {
		case "1":
			throw new Error("noop change should not trigger update")
			break;
	}
});
