import pair from "./pair";
import data from "./data.json";

import.meta.webpackHot.accept("./data.json");

// Two uses of the first import sort its dependencies before the second
// import's, past the accept call.
it("should re-import an accepted module whose import sorts after the accept", done => {
	expect(pair(1, 2)).toEqual([1, 2]);
	expect(pair(data.value, 0)).toEqual([1, 0]);
	NEXT(
		require("../../update")(done, true, () => {
			expect(data.value).toBe(2);
			done();
		})
	);
});
