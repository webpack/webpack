import store from "./store";

const update = require("../../update");

it("should keep a module the update removed disposed after the chunk requested before it", (done) => {
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
					const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
					try {
						__webpack_require__("./removed.js");
						expect(warn).toHaveBeenCalledWith(
							expect.stringContaining("to disposed module")
						);
					} finally {
						warn.mockRestore();
					}
					expect(store.removedRan).toBeUndefined();
					expect(statuses.filter((status) => status === "check")).toEqual(["check"]);
					done();
				})
				.catch(done);
		})
	);
});
