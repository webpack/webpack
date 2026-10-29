import store from "./store";
import "./holder";

module.hot.accept("./holder");

it("should keep updating a cached module that became async-only", (done) => {
	expect(store.value).toBe(1);
	NEXT(
		require("../../update")(done, true, () => {
			expect(store.value).toBe(1);
			NEXT(
				require("../../update")(done, true, () => {
					expect(store.value).toBe(3);
					done();
				})
			);
		})
	);
});
