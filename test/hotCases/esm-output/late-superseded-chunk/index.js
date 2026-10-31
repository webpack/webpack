import update from "../../update.esm";

HOLD.nativeImport = (url) => import(/* webpackIgnore: true */ url);

it("should apply an update over the chunk requested before it, waiting for it", (done) => {
	HOLD.start(/\/page\.chunk\./);
	const pending = import(/* webpackChunkName: "page" */ "./page");
	const statuses = [];
	let held;
	import.meta.webpackHot.addStatusHandler((status) => {
		statuses.push(status);
		if (status === "prepare" && held === undefined) {
			held = HOLD.count();
			// After the update chunks download, so the check is waiting for the load.
			setTimeout(HOLD.release, 0);
		}
	});
	NEXT(
		update(done, true, () => {
			expect(held).toBe(1);
			pending
				.then((m) => {
					expect(m.default).toBe(2);
					return import(/* webpackChunkName: "page" */ "./page");
				})
				.then((m) => {
					expect(m.default).toBe(2);
					expect(statuses.filter((status) => status === "check")).toEqual(["check"]);
					done();
				})
				.catch(done);
		})
	);
});
