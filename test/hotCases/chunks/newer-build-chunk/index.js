import store from "./store";
import "./entry";

it("should catch up before running a chunk that a newer build overwrote", (done) => {
	// Build two updates before applying the first, so its import() finds the
	// second build's chunk on disk.
	NEXT(() => {
		NEXT(
			require("../../update")(done, true, () => {
				store.pending.then(() => {
					expect(store.value).toBe(2);
					done();
				}, done);
			})
		);
	});
});
