import { value } from "./dep";

it("should run fine with the eval devtool", () => {
	expect(value).toBe(42);
});

it("should wrap the module in eval", () => {
	const self = require("fs").readFileSync(__filename, "utf8");
	expect(self).toContain("eval(");
});
