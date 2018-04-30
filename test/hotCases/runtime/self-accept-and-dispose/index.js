it("should accept itself and pass data", function(done) {
	require("./file")(done);
	NEXT(require("../../update")(done));
});
