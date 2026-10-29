import store from "./store";
import "./entry";

it("should catch up when only a sibling chunk comes from a newer build", (done) => {
	NEXT((err) => {
		if (err) return done(err);
		NEXT(
			require("../../update")(done, true, (stats) => {
				store.pending
					.then(() => {
						expect(store.value).toBe(3);
						expect(__webpack_hash__).toBe(stats.hash);
						return import(/* webpackChunkName: "page" */ "./page");
					})
					.then((m) => {
						expect(m.default).toBe(3);
						done();
					})
					.catch(done);
			})
		);
	});
});
