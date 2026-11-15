it("should rebuild the changed compiler", () => {
	expect(require("./value")).toBe(Number(WATCH_STEP) + 1);
});

it("should accept a partial result with unchanged output", (done) => {
	REBUILD(done);
});
