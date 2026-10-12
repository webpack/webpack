import value from "./module.js";
import pkg from "./pkg";
import data from "./loader.js!./with-loader.js";

it("should read paths changed while nothing watched them", () => {
	expect(value).toBe(2);
	expect(pkg).toBe("b");
	expect(data).toBe("2");
	expect(require("./later")).toBe(2);
	expect(() => require("./gone.js")).toThrow(/Cannot find module/);
});
