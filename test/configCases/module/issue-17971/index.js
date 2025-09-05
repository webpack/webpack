import pathModule from "./common.js";

it("should work", () => {
	expect(typeof pathModule.dirname).toBe("function");
});
