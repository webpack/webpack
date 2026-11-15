import store from "./store";
import { load } from "./importer";

export function loadOther() {
	return import("./other");
}

it("should keep updating a module an update injected from an unloaded chunk", (done) => {
	load()
		.then(() => {
			expect(store.value).toBe(1);
			NEXT(
				require("../../update")(done, true, () => {
					expect(store.value).toBe("shared");
					NEXT(
						require("../../update")(done, true, () => {
							expect(store.value).toBe("shared 2");
							done();
						})
					);
				})
			);
		})
		.catch(done);
});
