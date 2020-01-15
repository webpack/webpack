import value from "./file";

it("should auto-import an ES6 imported default value from non-harmony module on accept", (done) => {
	expect(value).toBe(1);
	module.hot.accept("./file", () => {
		expect(value).toBe(2);
		outside();
		done();
	});
	NEXT(require("../../update")(done));
});

function outside() {
	expect(value).toBe(2);
}
