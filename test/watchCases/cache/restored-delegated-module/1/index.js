// the build restores the delegated module from the pack without the Dll
// plugins, which its config asserts
it("should build without the dll", () => {
	expect(WATCH_STEP).toBe("1");
});
