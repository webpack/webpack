it("should load a duplicate module with different dependencies correctly", function() {
	var dedupe1 = require("./dedupe1");
	var dedupe2 = require("./dedupe2");
	dedupe1.should.be.eql("dedupe1");
	dedupe2.should.be.eql("dedupe2");
});
