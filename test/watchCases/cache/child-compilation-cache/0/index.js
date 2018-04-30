it("should use correct caches in compilation and child compilations", function() {
	var x = require("./report-cache-counters-loader!./changing-file");
	switch(WATCH_STEP) {
		case "0":
			x.should.be.eql([1, 1]);
			break;
		case "1":
			x.should.be.eql([2, 1]);
			break;
		case "2":
			x.should.be.eql([3, 2]);
			break;
		default:
			throw new Error("Not handled step");
	}
});
