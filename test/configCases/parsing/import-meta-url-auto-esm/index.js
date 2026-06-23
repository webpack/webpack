// `import.meta.url` (member form, no import/export) marks this as an ES module.
const url = import.meta.url;

function getThis() {
	return this;
}

it("should detect an ES module from import.meta.url", () => {
	expect(typeof url).toBe("string");
	expect(url.endsWith("index.js")).toBe(true);
	// Rendered in strict mode, so a plain call has `this === undefined`.
	expect(getThis()).toBe(undefined);
});
