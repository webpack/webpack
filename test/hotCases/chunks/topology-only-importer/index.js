import load from "./bridge";
import loadLater from "./later-bridge";
import store from "./store";

it("should not propagate an importer whose loading code only changed by chunk topology", (done) => {
	load().then(() => {
		expect(store.value).toBe(1);
		NEXT(
			require("../../update")(done, true, () => {
				expect(store.value).toBe(2);
				Promise.all([load(), loadLater()]).then(() => {
					expect(store.value).toBe(2);
					expect(store.later).toBe(3);
					done();
				}, done);
			})
		);
	}, done);
});
