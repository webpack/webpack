var should = require("should");

it("should make different modules for query", function() {
	var a = require("./empty");
	var b = require("./empty?1");
	var c = require("./empty?2");
	should.strictEqual(typeof a, "object");
	should.strictEqual(typeof b, "object");
	should.strictEqual(typeof c, "object");
	a.should.be.not.equal(b);
	a.should.be.not.equal(c);
	b.should.be.not.equal(c);
});

