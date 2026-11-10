it("should update modules when rebuilding DLL entries", () => {
	expect(require("./value")).toBe(Number(WATCH_STEP));
});
