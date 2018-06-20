import m from "./module";
import cm from "./changing-module";

it("should flag harmony modules correctly", function() {
	expect(m).toBe("module" + WATCH_STEP);
	switch(WATCH_STEP) {
		case "0":
			expect(cm).toBe("original");
			break;
		case "1":
			expect(cm).toBe("change");
			break;
	}
});
