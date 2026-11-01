it("should skip an inline loader resolveLoader.alias maps to false", () => {
	expect(require("gone-loader!./a")).toBe("value");
});

it("should skip a rule's loader resolveLoader.alias maps to false and run the others", () => {
	expect(require("./b")).toBe("VALUE");
});

it("should skip a context's loader resolveLoader.alias maps to false", () => {
	const context = require.context("gone-loader!./dir", false, /c\.js$/);
	expect(context.keys()).toEqual(["./c.js"]);
	expect(context("./c.js")).toBe("value");
});
