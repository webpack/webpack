import update from "../../update.esm";

HOLD.nativeImport = (url) => import(/* webpackIgnore: true */ url);

it("should apply the update when the chunk requested before it fails to load", (done) => {
	HOLD.start(/\/page\.chunk\./);
	const first = import(/* webpackChunkName: "page" */ "./page");
	let held;
	import.meta.webpackHot.addStatusHandler((status) => {
		if (status === "prepare" && held === undefined) {
			held = HOLD.count();
			// After the update chunks download, so the update waits for the load.
			setTimeout(() => {
				HOLD.fail(/\/page\.chunk\./);
				HOLD.release();
			}, 0);
		}
	});
	NEXT(
		update(done, true, () => {
			expect(held).toBe(1);
			first
				.then(
					() => done(new Error("the first load should fail")),
					() =>
						import(/* webpackChunkName: "page" */ "./page").then((m) => {
							expect(m.default).toBe(2);
							done();
						})
				)
				.catch(done);
		})
	);
});
