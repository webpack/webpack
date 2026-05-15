it("should unwrap a named export 'module.exports' for plain require()", () => {
	const required = require("./value.js");
	expect(typeof required).toBe("function");
	expect(required()).toBe(42);
	expect(required.named).toBe("named-prop");
});

it("should unwrap 'module.exports' for require() with property access", () => {
	expect(require("./value.js").named).toBe("named-prop");
	expect(require("./value.js").deep.nested).toBe("deep-value");
});

it("should unwrap 'module.exports' for require() with call", () => {
	expect(require("./value.js")()).toBe(42);
});

it("should unwrap 'module.exports' when it is a primitive", () => {
	expect(require("./plain.js")).toBe("i-am-the-module-exports");
});

it("should preserve namespace behavior when ESM has no 'module.exports' export", () => {
	const ns = require("./no-special-export.js");
	expect(ns.foo).toBe("foo-value");
	expect(ns.default).toBe("default-value");
});
