it("should report a source test that throws as a module error", () => {
	expect(() => require("./plain.js")).toThrow(/source test failed/);
});
