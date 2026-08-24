it("should assign the AMD result to the renamed module argument", () => {
	expect(require("./array-function").value).toBe("array-function");
	expect(require("./function").value).toBe("function");
	expect(require("./object").value).toBe("object");
});
