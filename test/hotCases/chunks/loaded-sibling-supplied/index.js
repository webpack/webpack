import store from "./store";
import { load } from "./importer";

it("should not re-execute a loaded chunk's unchanged module shipped with an update", (done) => {
	Promise.all([import("./other"), load()])
		.then(() => {
			expect(store.value).toBe(1);
			expect(store.runs).toBe(1);
			NEXT(
				require("../../update")(done, true, () => {
					expect(store.value).toBe("shared");
					expect(store.runs).toBe(1);
					done();
				})
			);
		})
		.catch(done);
});
