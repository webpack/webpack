it("should return different modules with different casing", function() {
	var a = require("./a");
	var A = require("./A");
	var b = require("./b/file.js");
	var B = require("./B/file.js");
	a.should.not.be.equal(A);
	b.should.not.be.equal(B);
});
