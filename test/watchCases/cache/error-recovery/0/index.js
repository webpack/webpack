// A module carrying a build error is rebuilt on every build, so the pack must
// not keep serving the broken state once the module resolves.
it("should recover from a resolve error and keep updating afterwards", () => {
	const step = Number(WATCH_STEP);
	if (step === 0) {
		expect(() => require("some-module")).toThrow();
	} else {
		expect(require("some-module")).toBe(step === 1 ? "ok" : "ok-2");
	}
});
