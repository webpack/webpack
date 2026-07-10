const query = require("./a");

it("should derive resource fields after beforeLoaders mutates module.resource", () => {
	expect(query).toBe("?injected");
});
