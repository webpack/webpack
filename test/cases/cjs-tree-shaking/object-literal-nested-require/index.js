it("should drop unused methods/getters that contain require without breaking codegen", () => {
	const m = require("./lib");
	expect(m.used).toBe("used");
	expect(m.usedExports).toEqual(["used", "usedExports"]);
});
