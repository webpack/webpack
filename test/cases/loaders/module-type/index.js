it("should use the type set by the loader", function() {
	const jsonContent = require("./loader/index.js!./foo.json");
	expect(jsonContent).toBe("it-should-not-use-json-parser");
});
