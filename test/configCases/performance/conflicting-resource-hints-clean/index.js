it("should stay quiet when each chunk carries one directive", () =>
	Promise.all([
		import(/* webpackPrefetch: true, webpackChunkName: "lazy" */ "./lazy"),
		import(/* webpackPreload: true, webpackChunkName: "eager" */ "./eager")
	]).then(([lazy, eager]) => {
		expect(lazy.default).toBe("lazy");
		expect(eager.default).toBe("eager");
	}));
