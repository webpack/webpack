// Verify webpack's `require(esm)` "module.exports" unwrapping matches what
// Node.js does natively.
//
// `webpackIgnore: true` instructs webpack to leave a `require()` call literal
// in the bundle. Inside the Jest harness those calls would still be
// intercepted (Jest replaces `require()` with its own runtime), so for the
// actual semantic comparison we shell out to a fresh `node` subprocess and
// let it require the same `.mjs` files through its own real `require(esm)`.
//
// What's verified:
//   * webpack-transformed `require("./*.mjs")` returns the same value as
//     Node's real `require(absolutePath)`.
//   * webpack leaves `require(/* webpackIgnore: true */ …)` literal in the
//     emitted bundle (asserted by reading the bundle source).
const { execFileSync } = require("child_process");
const fs = require("fs");

const valueMjsPath = VALUE_MJS_PATH;
const plainMjsPath = PLAIN_MJS_PATH;
const noSpecialMjsPath = NO_SPECIAL_MJS_PATH;

/**
 * Loads `modulePath` in a fresh `node` subprocess, evaluates `expr` on the
 * result (bound to `m`), and returns the JSON-decoded value.
 */
const nodeRequireValue = (modulePath, expr) => {
	const script = `process.stdout.write(JSON.stringify(((m) => (${expr}))(require(${JSON.stringify(modulePath)}))))`;
	return JSON.parse(execFileSync(process.execPath, ["-e", script]));
};

// Never called — present only so webpack emits a literal
// `require(/* webpackIgnore: true */ …)` call into the bundle, which the
// test below asserts on.
// eslint-disable-next-line no-unused-vars
function _emitsLiteralRequire(path) {
	return require(/* webpackIgnore: true */ path);
}

it("leaves `require(/* webpackIgnore: true */ …)` literal in the bundle", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toMatch(
		/require\(\s*\/\*\s*webpackIgnore:\s*true\s*\*\/\s*path\s*\)/
	);
});

it("should unwrap a named export 'module.exports' for plain require()", () => {
	const required = require("./value.mjs");
	expect(typeof required).toBe("function");
	expect(required()).toBe(42);
	expect(required()).toBe(nodeRequireValue(valueMjsPath, "m()"));
	expect(required.named).toBe("named-prop");
	expect(required.named).toBe(nodeRequireValue(valueMjsPath, "m.named"));
});

it("should unwrap 'module.exports' for require() with property access", () => {
	expect(require("./value.mjs").named).toBe(
		nodeRequireValue(valueMjsPath, "m.named")
	);
	expect(require("./value.mjs").deep.nested).toBe(
		nodeRequireValue(valueMjsPath, "m.deep.nested")
	);
});

it("should unwrap 'module.exports' for require() with call", () => {
	expect(require("./value.mjs")()).toBe(nodeRequireValue(valueMjsPath, "m()"));
});

it("should unwrap 'module.exports' for destructuring assignment", () => {
	const { named } = require("./value.mjs");
	expect(named).toBe(nodeRequireValue(valueMjsPath, "m.named"));
});

it("should unwrap 'module.exports' when it is a primitive", () => {
	expect(require("./plain.mjs")).toBe("i-am-the-module-exports");
	expect(require("./plain.mjs")).toBe(nodeRequireValue(plainMjsPath, "m"));
});

it("should preserve namespace behavior when ESM has no 'module.exports' export", () => {
	const ns = require("./no-special-export.mjs");
	expect(ns.foo).toBe("foo-value");
	expect(ns.foo).toBe(nodeRequireValue(noSpecialMjsPath, "m.foo"));
	expect(ns.default).toBe("default-value");
	expect(ns.default).toBe(nodeRequireValue(noSpecialMjsPath, "m.default"));
});
