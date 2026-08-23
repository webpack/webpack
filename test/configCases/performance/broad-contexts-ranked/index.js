const icons = require.context("./icons");
const locales = require.context("./locale");

it("should rank both contexts, breaking the tie by name", () => {
	expect(icons.keys().length).toBe(40);
	expect(locales.keys().length).toBe(40);
});
