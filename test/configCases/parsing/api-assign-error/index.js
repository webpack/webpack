it("should error when assigning to a read-only webpack API", () => {
	expect(() => require("./bad")).toThrow(/must not be assigned/);
});
