it("should detect changes in a loader context dependency", function() {
	var result = require("./loader!");
	expect(result.length).toBe(+WATCH_STEP % 3 + 1);
});
