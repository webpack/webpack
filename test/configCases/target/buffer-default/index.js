require("should");

it("should provide a global Buffer shim", function () {
	Buffer.should.be.a.Function();
});

it("should provide the buffer module", function () {
	var buffer = require("buffer");
	(typeof buffer).should.be.eql("object");
});
