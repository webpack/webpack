const dep = require("./dep");

it("should stay quiet for CommonJS, where 'this' is module.exports", () => {
	expect(dep.value).toBe("from module.exports");
	expect(__STATS__.warnings).toHaveLength(0);
});
