it("should not throw when no dependency reference", function() {
	return expect(() => import("side-effect-free")).not.toThrow();
});
