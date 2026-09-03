const context = require.context("./dir", false, /^\.\/[ab]\.js$/);

it("should apply the issuer's rule-level resolver plugin to the context's children", () => {
	expect(context.keys().map(context)).toEqual(["a-alt", "b"]);
});
