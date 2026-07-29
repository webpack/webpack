it("should remove unused getters and methods from module.exports = { … }", () => {
	const m = require("./lib");
	expect(m.used).toBe("used-value");
	expect(m.usedGetter).toBe("used-getter");
	expect(m.usedExports).toEqual(["used", "usedExports", "usedGetter"]);
});
