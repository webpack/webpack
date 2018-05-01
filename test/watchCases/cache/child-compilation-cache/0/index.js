it("should use correct caches in compilation and child compilations", function() {
	var x = require("./report-cache-counters-loader!./changing-file");
	switch(WATCH_STEP) {
		case "0":
			expect(x).toEqual([1, 1]);
			break;
		case "1":
			expect(x).toEqual([2, 1]);
			break;
		case "2":
			expect(x).toEqual([3, 2]);
			break;
		default:
			throw new Error("Not handled step");
	}
});
