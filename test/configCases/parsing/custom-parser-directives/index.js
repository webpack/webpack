it("should detect a strict directive an AST does not mark as one", () => {
	expect(require("./strict")).toEqual([42, true]);
});

it("should keep rejecting strings that only read like a directive", () => {
	expect(require("./escaped")).toEqual([42, false]);
	expect(require("./parenthesized")).toEqual([42, false]);
});
