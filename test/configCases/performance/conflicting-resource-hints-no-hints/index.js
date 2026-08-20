it("should report the contradiction even where size hints are off", () =>
	import(
		/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "lazy" */ "./lazy"
	).then(({ default: lazy }) => {
		expect(lazy).toBe("lazy");
	}));
