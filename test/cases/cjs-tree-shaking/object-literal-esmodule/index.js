it("should keep __esModule and drop unused properties", () => {
	const m = require("./lib");
	expect(m.used).toBe("used-value");
	expect(m.__esModule).toBe(true);
	expect(m.usedExports).toEqual(["__esModule", "used", "usedExports"]);
});
