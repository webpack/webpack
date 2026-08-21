it("should not report an alias a context module resolved through", () => {
	const lang = "en";

	return import(`@locales/${lang}.js`).then((module) => {
		expect(module.default).toBe("en");
	});
});
