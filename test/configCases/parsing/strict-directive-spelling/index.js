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
