const lib = require("./barrel");

it("should reexport whole submodules via Object.defineProperty value", () => {
	expect(new lib.PluginA().apply()).toBe("A");
	expect(lib.PluginB()).toBe("B");
	expect(lib.util.helper()).toBe("helper");
	expect(lib.util.value).toBe(42);
});

it("should reexport a single nested property via Object.defineProperty value", () => {
	expect(lib.value).toBe(42);
});

it("should define the reexports as non-enumerable, read-only properties", () => {
	const desc = Object.getOwnPropertyDescriptor(lib, "PluginB");
	expect(desc.enumerable).toBe(false);
	expect(desc.writable).toBe(false);
});
