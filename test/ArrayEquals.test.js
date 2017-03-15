var should = require("should");

var arrayEquals = require("../lib/arrayEquals");

describe("ArrayEquals", function() {
	it("arrayEquals should compare arrays of primitives", function() {
		var a = [null, 7, "5", 6];
		var b = ["5", 6, null, 7];
		var c = ["5", 6, null, 7];

		arrayEquals(a, b).should.equal(false);
		arrayEquals(b, c).should.equal(true);
	});
});
