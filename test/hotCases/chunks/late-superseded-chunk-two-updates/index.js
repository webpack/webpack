const update = require("../../update");

module.hot.accept("./page");

it("should apply a second update normally after the first waited for the chunk requested before it", (done) => {
	HOLD.start(/\/page\.chunk\./);
	const pending = import(/* webpackChunkName: "page" */ "./page");
	const statuses = [];
	let held;
	module.hot.addStatusHandler((status) => {
		statuses.push(status);
		if (status === "prepare" && held === undefined) {
			held = HOLD.count();
			HOLD.release();
		}
	});
	NEXT(
		update(done, true, () => {
			expect(held).toBe(1);
			pending
				.then((m) => {
					expect(m.default).toBe(2);
					NEXT(
						update(done, true, () => {
							import(/* webpackChunkName: "page" */ "./page")
								.then((m) => {
									expect(m.default).toBe(3);
									expect(statuses.filter((status) => status === "check")).toEqual([
										"check",
										"check"
									]);
									done();
								})
								.catch(done);
						})
					);
				})
				.catch(done);
		})
	);
});
