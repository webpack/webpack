import update from "../../update.esm";
import store from "./store";
import "./a";

it("should keep running a cached module that moved into a chunk shared with another entry", (done) => {
	expect(store.value).toBe("m");
	expect(store.runs).toBe(1);
	NEXT(
		update(done, true, () => {
			expect(store.value).toBe("m");
			expect(store.runs).toBe(1);
			done();
		})
	);
});
