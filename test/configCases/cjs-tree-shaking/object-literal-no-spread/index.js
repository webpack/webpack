it("should keep unused properties when object spread is unsupported", () => {
	const m = require("./lib");
	expect(m.used).toBe("used");
	expect(m.unused).toBe("unused-value");
});
