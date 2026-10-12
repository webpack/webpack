import value from "./module.js";
import gone from "./gone.js";

it("should read paths changed while nothing watched them", () => {
	expect(value).toBe(1);
	expect(gone).toBe(1);
	expect(() => require("./later")).toThrow(/Cannot find module/);
});
