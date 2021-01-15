it("should able to accept for another module", (done) => {
	require("./a")(done);
	NEXT(require("../../update")(done));
});
