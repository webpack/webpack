const value = require("./value");

it("runs loaders on the main thread when experiments.threads is off", () => {
	expect(value).toBe("main:1");
});
