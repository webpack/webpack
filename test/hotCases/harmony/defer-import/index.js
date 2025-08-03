import * as a /* webpackDefer: true */ from "./a.js";

it("should handle defer import", (done) => {
	expect(a.a).toBe("1");

    module.hot.accept("./a", function() {
		expect(a.a).toBe("2");
		done();
	});
	NEXT(require("../../update")(done));
});