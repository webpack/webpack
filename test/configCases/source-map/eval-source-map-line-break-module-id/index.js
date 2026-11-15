import value from "./module.js?a\nb";

it("should evaluate a module whose id contains a line break", () => {
	expect(value).toBe("value");
});

it("should encode the line break in the sourceURL comment", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toContain(
		"//# sourceURL=webpack-internal:///./module.js?a%0Ab"
	);
});
