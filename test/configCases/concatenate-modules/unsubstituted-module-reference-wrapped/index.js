import leak from "./leak";

// The build fails, so the case only checks its error (test.config.js sets
// noTests); the import keeps `leak.js` from being tree-shaken away.
it("should not run", () => {
	expect(leak.value).toBe(undefined);
});
