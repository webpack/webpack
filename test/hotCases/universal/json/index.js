import data from "./data.json";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./data.json"]);

it("should update a JSON module in a universal target", (done) => {
	expect(data.value).toBe("json-1");

	NEXT(
		update(done, true, () => {
			import("./data.json")
				.then((updated) => {
					expect(updated.default.value).toBe("json-2");
					done();
				})
				.catch(done);
		})
	);
});
