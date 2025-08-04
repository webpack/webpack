import * as a /* webpackDefer: true */ from "./a.js";
import * as a2 from "./a.js";

it("should handle defer import", (done) => {
	expect(a.a).toBe("1");
	expect(a2.a).toBe("1");

    module.hot.accept("./a", function() {
		expect(a.a).toBe("2");
		expect(a2.a).toBe("2");
		done();
	});
	NEXT(require("../../update.js")(done));
});