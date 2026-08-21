// The catch-all regExp is still there, so only `exclude` narrows this one.
const locales = import.meta.webpackContext("./locale", {
	recursive: false,
	regExp: /^\.\/.*$/,
	exclude: /(aa|bb|cc)\.js$/
});

it("should stay quiet when a context is narrowed by exclude", () => {
	expect(locales.keys().length).toBeGreaterThan(0);
});
