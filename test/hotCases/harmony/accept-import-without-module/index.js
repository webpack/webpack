import { value } from "./file";

it("should compile HMR accept code for a module whose accept references a dependency without a module", function (done) {
	expect(value).toBe(1);
	module.hot.accept("./file", function () {
		expect(value).toBe(2);
		done();
	});
	NEXT(require("../../update")(done));
});
