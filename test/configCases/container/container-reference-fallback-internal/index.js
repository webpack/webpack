it("should resolve a remote when an internal fallback precedes a real external", () => {
	return import("./module").then(({ test }) => test());
});
