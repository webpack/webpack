const context = require("./a");

it("should not let config.loader override the loader-runner's context field", () => {
	// runner's `context` (resource dir) must win over `config.loader.context`
	expect(context).not.toBe("OVERRIDDEN");
	expect(context).toContain("config-loader-precedence");
});
