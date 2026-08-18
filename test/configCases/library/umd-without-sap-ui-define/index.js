const fs = require("fs");

it("should not emit the sap.ui.define branch by default", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	// the UMD wrapper is everything in front of the factory
	const wrapper = source.slice(0, source.indexOf("{\nreturn "));
	expect(wrapper).toContain('define("MyLibrary", [], factory)');
	expect(wrapper).not.toContain("sap");
});

export const answer = 42;
