import value1 from "./a";
import value2 from "./b";

it("should allow to hot replace modules in a ConcatenatedModule", (done) => {
	expect(value1).toBe(1);
	expect(value2).toBe(10);
	module.hot.accept("./a", () => {
		expect(value1).toBe(2);
		NEXT(require("../../update")(done));
	});
	module.hot.accept("./b", () => {
		expect(value2).toBe(20);
		done();
	});
	NEXT(require("../../update")(done));
});
