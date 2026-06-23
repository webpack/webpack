// `import.meta.dirname`/`import.meta.filename` are ESM-only Node APIs, so using
// them (without import/export) marks the module as an ES module, like Node.js.
const dir = import.meta.dirname;
const file = import.meta.filename;

function getThis() {
	return this;
}

it("should detect an ES module from import.meta.dirname/filename", () => {
	// Rendered as a strict ES module (a plain call's `this` is undefined).
	expect(getThis()).toBe(undefined);
	expect(typeof dir).toBe("string");
	expect(typeof file).toBe("string");
});
