it("should report every conflicting link, and leave a lone prefetch alone", () =>
	Promise.all([
		import(
			/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "zebra" */ "./zebra"
		),
		import(
			/* webpackPrefetch: true, webpackPreload: true, webpackChunkName: "alpha" */ "./alpha"
		),
		// Prefetched but not preloaded, so it is not a conflict.
		import(/* webpackPrefetch: true */ "./only-prefetch"),
		// No chunk name, so the report falls back to naming it by its chunks.
		import(/* webpackPrefetch: true, webpackPreload: true */ "./unnamed")
	]).then(([zebra, alpha, only, unnamed]) => {
		expect(zebra.default).toBe("zebra");
		expect(alpha.default).toBe("alpha");
		expect(only.default).toBe("prefetch only");
		expect(unnamed.default).toBe("unnamed");
	}));
