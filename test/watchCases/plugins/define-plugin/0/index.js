it("should be able to use dynamic defines in watch mode", function() {
	const module = require("./module");
	module.should.be.eql({
		default: WATCH_STEP,
		type: "string"
	});
});

it("should not update a define when dependencies list is missing", function() {
	const module2 = require("./module2");
	module2.should.be.eql({
		default: "0",
		type: "string"
	});
});
