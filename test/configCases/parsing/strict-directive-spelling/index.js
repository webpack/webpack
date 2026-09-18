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
