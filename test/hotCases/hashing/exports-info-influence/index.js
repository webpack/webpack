const moduleValue = require("./module");
const external = require("external");
import referencer from "./referencer";

it("should keep the module hash when usage changes", done => {
	expect(moduleValue).toBe("module");
	expect(external).toBe("external");
	expect(referencer).toBe(42);
	module.hot.accept("./referencer", () => {
		expect(referencer).toBe("undefined undefined");
		done();
	});
	NEXT(require("../../update")(done));
});
