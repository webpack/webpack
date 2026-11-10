import update from "../../update.esm";
import store from "./store";
import { loadB } from "./importer";

it("should supply a chunk that was a sibling only through a group the client did not load", (done) => {
	loadB()
		.then(() => {
			expect(store.value).toBe(1);
			NEXT(
				update(done, true, () => {
					expect(store.value).toBe("x");
					done();
				})
			);
		})
		.catch(done);
});
