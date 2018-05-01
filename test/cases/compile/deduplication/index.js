it("should load a duplicate module with different dependencies correctly", function() {
	var dedupe1 = require("./dedupe1");
	var dedupe2 = require("./dedupe2");
	expect(dedupe1).toBe("dedupe1");
	expect(dedupe2).toBe("dedupe2");
});
