const locales = import.meta.webpackContext('./locales', {
	recursive: false,
	regExp: /(en|hu)\.json$/i,
});
const vuetify = import.meta.webpackContext('vuetify/lib/locale', {
	recursive: false,
	regExp: /(en|hu)\.json$/i,
});

it('should resolve "./locales"', () => {
	expect(locales("./en.json")).toEqual({});
	expect(() => locales("./hu.json")).toThrow();
});

it('should resolve "vuetify"', () => {
	expect(vuetify("./en.json")).toEqual({});
	expect(vuetify("./hu.json")).toEqual({});
	expect(() => vuetify("./ru.json")).toThrow();
});
