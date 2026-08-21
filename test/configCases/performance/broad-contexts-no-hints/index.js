const locales = require.context("./locale");

it("should stay quiet when hints are off", () => {
	expect(locales.keys().length).toBe(40);
});
