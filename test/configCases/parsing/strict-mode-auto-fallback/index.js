it("should reject a with statement after a return in strict code", () => {
	expect(() => require("./with")).toThrow(/'with' in strict mode/);
});

it("should reject a legacy octal literal after a return in strict code", () => {
	expect(() => require("./octal")).toThrow(/Invalid number/);
});

it("should preserve strict mode when a top-level return selects script mode", () => {
	expect(require("./strict")).toBe(true);
});

it("should keep a script without a strict directive non-strict", () => {
	expect(require("./loose")).toBe(42);
});

it("should keep a script whose strict-looking string is no directive non-strict", () => {
	expect(require("./escaped")).toBe(42);
	expect(require("./parenthesized")).toBe(42);
	expect(require("./after-expression")).toBe(42);
	expect(require("./function-directive")).toBe(42);
});
