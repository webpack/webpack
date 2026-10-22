it("should not resolve a dll request from the pack without the Dll plugins", () => {
	expect(() => require("dll/item")).toThrow(/Cannot find module 'dll\/item'/);
});
