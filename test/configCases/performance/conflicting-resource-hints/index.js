it("should report a chunk asked for as both prefetch and preload", () =>
	import(
		/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "lazy" */ "./lazy"
	).then(({ default: lazy }) => {
		expect(lazy).toBe("lazy");
	}));
