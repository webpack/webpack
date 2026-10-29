import update from "../../update.esm";

HOLD.nativeImport = (url) => import(/* webpackIgnore: true */ url);

it("should load the new version of a module the update moved out of the chunk requested before it", (done) => {
	HOLD.start(/\/page\.chunk\./);
	const pending = import(/* webpackChunkName: "page" */ "./page");
	const statuses = [];
	let held;
	import.meta.webpackHot.addStatusHandler((status) => {
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
					expect(m.default).toBe("page2");
					return import(/* webpackChunkName: "q" */ "./q");
				})
				.then((m) => {
					expect(m.default).toBe("q2-m2");
					expect(statuses.filter((status) => status === "check")).toEqual(["check"]);
					done();
				})
				.catch(done);
		})
	);
});
