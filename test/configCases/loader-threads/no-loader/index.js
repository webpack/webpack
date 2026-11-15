const value = require("./value");

it("runs a module with no loaders in a worker", () => {
	expect(value).toBe(1);
});
