it("should emit an error instead of silently resolving the external to undefined", () => {
	const external = require("external0");
	expect(external).toBeUndefined();
});
