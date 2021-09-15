import a from "./a";

it("should not throw on circular dependencies", (done) => {
	expect(a).toBe(1);
	module.hot.accept("./a", () => {
		expect(a).toBe(2);
		done();
	});
	NEXT(require("../../update")(done));
});
