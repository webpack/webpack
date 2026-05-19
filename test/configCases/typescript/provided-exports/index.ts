import * as mod from "./module.js";

it("should work", () => {
	expect(Object.keys(mod).sort()).toEqual(["a", "c"]);
});
