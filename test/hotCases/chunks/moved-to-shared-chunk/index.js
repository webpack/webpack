import store from "./store";
import "./a";

it("should keep running a cached module that moved into a chunk shared with another entry", (done) => {
	expect(store.value).toBe("m");
	expect(store.runs).toBe(1);
	NEXT(
		require("../../update")(done, true, () => {
			expect(store.value).toBe("m");
			expect(store.runs).toBe(1);
			done();
		})
	);
});
