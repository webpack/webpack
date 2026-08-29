it("should report a throwing sync tap as this module's build error", () => {
	expect(() => require("../_images/file.png")).toThrow("sync tap threw");
});
