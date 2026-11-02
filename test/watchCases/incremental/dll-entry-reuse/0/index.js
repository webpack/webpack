it("should update modules while retaining the DLL entry dependencies", () => {
	expect(require("./value")).toBe(Number(WATCH_STEP));
});
