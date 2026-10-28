import update from "../../update.esm";
import store from "./store";
import { load } from "./importer";

export function loadOther() {
	return import("./other");
}

it("should supply a dependency an already loaded async module gains from an unloaded chunk", (done) => {
	load()
		.then(() => {
			expect(store.value).toBe(1);
			NEXT(
				update(done, true, () => {
					expect(store.value).toBe("shared");
					done();
				})
			);
		})
		.catch(done);
});
