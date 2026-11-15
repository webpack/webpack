it("should not unwrap a JSON key named module.exports reached through export *", () => {
	const required = require("./esm.js");
	expect(typeof required).toBe("object");
	expect(required.b).toBe(2);
	expect(required.a).toBe(1);
	expect(required["module.exports"]).toBe(42);
});
