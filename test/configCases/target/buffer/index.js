it("should provide a global Buffer shim", function () {
	expect(Buffer).toBeInstanceOf(Function);
});

it("should fail on the buffer module"/*, function () {
	(function(argument) {
		try {
			require("buffer");
		} catch(e) { throw e; }
	}).should.throw();
}*/);
