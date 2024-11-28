it("should load shared module eagerly", async () => {
	const reactValue = require("react");
	expect(reactValue).toBe("react-value");
});

it("should load exposed module that uses shared module", async () => {
	const ComponentA = require("./ComponentA");
	expect(ComponentA.default()).toBe("ComponentA with react-value");
});
