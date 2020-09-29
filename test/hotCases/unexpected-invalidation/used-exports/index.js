import { ghi } from "./subject";
import value from "./module";

it("should not invalidate subject in unrelated locations", done => {
	expect(ghi).toBe(42);
	expect(value).toBe(40);
	import.meta.webpackHot.accept("./module", () => {
		expect(ghi).toBe(42);
		expect(value).toBe(41);
		done();
	});
	NEXT(require("../../update")(done));
});
