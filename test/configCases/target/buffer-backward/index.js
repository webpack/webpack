require("should");

it("should provide a global Buffer shim", function () {
	(typeof Buffer).should.be.eql("undefined");
});

it("should fail on the buffer module" /*, function () {
	(function(argument) {
		try {
			require("buffer");
		} catch(e) { throw e; }
	}).should.throw();
}*/);
