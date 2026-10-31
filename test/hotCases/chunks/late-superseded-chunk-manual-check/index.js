module.hot.accept("./page");

it("should not hold a chunk that installs while a manual check runs", (done) => {
	HOLD.start(/\/page\.chunk\./);
	const pending = import(/* webpackChunkName: "page" */ "./page");
	let held;
	module.hot.addStatusHandler((status) => {
		if (status === "prepare" && held === undefined) {
			held = HOLD.count();
			// After the update chunks download, so the check waits for the load.
			setTimeout(HOLD.release, 0);
		}
	});
	NEXT((err) => {
		if (err) return done(err);
		module.hot
			.check()
			.then(() => {
				expect(held).toBe(1);
				expect(module.hot.status()).toBe("ready");
				// A caller may wait for the import before it calls apply().
				return pending;
			})
			.then((m) => {
				expect(m.default).toBe(1);
				return module.hot.apply();
			})
			.then(() => import(/* webpackChunkName: "page" */ "./page"))
			.then((m) => {
				expect(m.default).toBe(2);
				done();
			})
			.catch(done);
	});
});
