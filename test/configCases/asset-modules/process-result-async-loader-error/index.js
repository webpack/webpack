it("should report the loader's error, not swallow it, when the async hook is tapped", () => {
	expect(() => require("../_images/file.png")).toThrow("loader blew up");
});
