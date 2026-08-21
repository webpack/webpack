const locales = require.context("./locale");

it("should warn about a context with no filter", () => {
	expect(locales.keys().length).toBe(40);
});
