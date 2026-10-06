it("should not make parenthesized strings strict directives", () => {
	expect(require("./parenthesized")).toBe(false);
});

it("should not make escaped strings strict directives", () => {
	expect(require("./escaped")).toBe(false);
	expect(require("./continued")).toBe(false);
});

it("should preserve real strict directives", () => {
	expect(require("./strict")).toBe(true);
});

it("should preserve strict mode after other directives when prepending code", () => {
	expect(require("./prologue")).toEqual([42, true]);
});

it("should not recognize strict directives after the prologue ends", () => {
	expect(require("./after-expression")).toBe(false);
	expect(require("./after-parenthesized")).toBe(false);
});

it("should read a single-quoted directive and skip an escaped one after another", () => {
	expect(require("./single-quoted")).toBe(true);
	expect(require("./escaped-after-custom")).toBe(false);
	expect(require("./custom")).toBe(false);
});

const FUNCTIONS = {
	strictDouble: false,
	strictSingle: false,
	afterCustom: false,
	repeated: false,
	afterExpression: true,
	afterParenthesized: true,
	escapedAfterCustom: true,
	parenthesized: true,
	escaped: true,
	continued: true
};

it("should detect each spelling inside a function body", () => {
	expect(require("./functions")).toEqual(FUNCTIONS);
});

it("should detect each spelling from an AST that states no directive", () => {
	expect(require("./functions?ast")).toEqual(FUNCTIONS);
	expect(require("./single-quoted?ast-no-raw")).toBe(true);
	expect(require("./custom?ast-no-raw")).toBe(false);
});
