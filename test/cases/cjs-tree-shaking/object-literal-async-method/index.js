it("should drop unused async and generator methods from module.exports = { … }", () => {
	const m = require("./lib");
	expect(m.used).toBe("used");
	expect(m.usedExports).toEqual(["used", "usedExports"]);
});
