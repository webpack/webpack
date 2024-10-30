let value = require("./module.js");
import {a} from "./lib/a.js";

it("should compile", (done) => {
	expect(value).toBe(1);
	expect(a).toBe(1);
	module.hot.accept("./module.js", () => {
		value = require("./module");
		expect(value).toBe(2);
		done();
	});
	NEXT(require("../../update")(done));
});
