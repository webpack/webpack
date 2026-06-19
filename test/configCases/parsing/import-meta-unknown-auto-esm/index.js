// An unknown `import.meta` property (no import/export) is still enough to make
// this an ES module, matching Node.js where `import.meta` only exists in ESM.
const value = import.meta.someUnknownProperty;

function getThis() {
	return this;
}

it("should detect an ES module from an unknown import.meta property", () => {
	// Unknown members resolve to `undefined`...
	expect(value).toBe(undefined);
	// ...and the module is still rendered as a strict ES module.
	expect(getThis()).toBe(undefined);
});
