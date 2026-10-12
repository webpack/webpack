import value from "./module.js";

it("should read paths changed while nothing watched them", () => {
	expect(value).toBe(2);
	expect(require("./later")).toBe(2);
	expect(() => require("./gone.js")).toThrow(/Cannot find module/);
});
