const foo = require("foo");

it("should resolve the nwjs exports condition", () => {
	expect(foo).toBe("nwjs");
});
