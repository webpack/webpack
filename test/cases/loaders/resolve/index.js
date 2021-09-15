it("should be possible to create resolver with different options", () => {
	const result = require("./loader!");
	expect(result).toEqual({
		one: "index.js",
		two: "index.xyz",
		three: "index.js",
		four: "index.xyz",
		five: "index.js"
	});
});
