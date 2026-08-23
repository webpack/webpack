const locales = require.context("./locale", false, /^\.\/(aa|bb)\.js$/);
const icons = require.context("./icons");

it("should stay quiet for a narrowed context and a small one", () => {
	expect(locales.keys().length).toBe(2);
	expect(icons.keys().length).toBe(6);
});
