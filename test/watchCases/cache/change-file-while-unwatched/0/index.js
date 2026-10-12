import value from "./module.js";
import gone from "./gone.js";
import pkg from "./pkg";
import data from "./loader.js!./with-loader.js";

it("should read paths changed while nothing watched them", () => {
	expect(value).toBe(1);
	expect(gone).toBe(1);
	expect(pkg).toBe("a");
	expect(data).toBe("1");
	expect(() => require("./later")).toThrow(/Cannot find module/);
});
