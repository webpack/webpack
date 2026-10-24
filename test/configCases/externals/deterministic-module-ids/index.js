const first = require("./shared");
const second = require("../shared");
const fs = require("fs");
const prefixedFs = require("node:fs");
const single = require("single");

it("should use the same external for both requests", () => {
	expect(first).toBe(second);
	expect(typeof first.join).toBe("function");
});

it("should name shared externals independently of resolution order", () => {
	expect(require.resolveWeak("./shared")).toBe("../shared");
	expect(require.resolveWeak("./shared")).toBe(require.resolveWeak("../shared"));
});

it("should preserve names for single requests and core modules", () => {
	expect(typeof single).toBe("function");
	expect(require.resolveWeak("single")).toBe("single");
	expect(fs).toBe(prefixedFs);
	expect(require.resolveWeak("fs")).toBe("fs");
	expect(require.resolveWeak("node:fs")).toBe("fs");
});
