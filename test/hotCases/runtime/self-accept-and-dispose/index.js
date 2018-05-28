it("should accept itself and pass data", (done) => {
	require("./file")(done);
	NEXT(require("../../update")(done));
});
