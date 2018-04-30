it("should not be moved", function() {
	expect(new Error().stack).not.toMatch(/webpackBootstrap/);
});
