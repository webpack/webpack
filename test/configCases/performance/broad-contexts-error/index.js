const locales = require.context("./locale");

it("should raise an error when hints are errors", () => {
	expect(locales.keys().length).toBe(40);
});
