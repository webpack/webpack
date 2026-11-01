const update = require("../../update");

it("should not run the chunk requested before an update while a blocking load ends the download", (done) => {
	HOLD.start(/\/page\.chunk\./);
	let statusOnResolve;
	const pending = import(/* webpackChunkName: "page" */ "./page").then((m) => {
		statusOnResolve = module.hot.status();
		return m;
	});
	let other;
	module.hot.addStatusHandler((status) => {
		if (status === "prepare" && other === undefined) {
			// A load started now blocks the update, which then passes "ready" on its way to apply.
			other = import(/* webpackChunkName: "other" */ "./other");
			HOLD.release();
		}
	});
	NEXT(
		update(done, true, () => {
			Promise.all([pending, other])
				.then(([page, otherModule]) => {
					expect(otherModule.default).toBe("other");
					expect(statusOnResolve).toBe("idle");
					expect(page.default).toBe(2);
					done();
				})
				.catch(done);
		})
	);
});
