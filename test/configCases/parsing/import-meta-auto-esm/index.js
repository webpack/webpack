// No import/export syntax: `import.meta` alone marks this as an ES module,
// so the module is rendered in strict mode (matching Node.js).
void import.meta;

function getThis() {
	return this;
}

it("should treat a module using import.meta as a strict ES module", () => {
	expect(getThis()).toBe(undefined);
});
