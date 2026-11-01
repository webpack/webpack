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

it("should keep a context's loader that resolves", () => {
	const context = require.context("upper-loader!./dir", false, /c\.js$/);
	expect(context("./c.js")).toBe("VALUE");
});

it("should report a loader that cannot be resolved", () => {
	expect(() => require("missing-loader!./a")).toThrow(/Cannot find module/);
});

it("should report a context's loader that cannot be resolved", () => {
	expect(() =>
		require.context("missing-loader!./dir", false, /c\.js$/)
	).toThrow(/Cannot find module/);
});
