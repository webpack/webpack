it("module.noParse accepts a file URL instance", () => {
	const fn = require("./not-parsed");
	expect(typeof fn).toBe("function");
});
