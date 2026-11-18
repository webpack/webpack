import data from "./data.json" with { type: "json" };
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./data.json"]);

const load = () => import("./data.json", { assert: { type: "json" } });

it("should accept a JSON module imported with both with and assert", (done) => {
	expect(data.value).toBe("attr-1");
	NEXT(
		update(done, true, () => {
			load()
				.then((updated) => {
					expect(updated.default.value).toBe("attr-2");
					done();
				})
				.catch(done);
		})
	);
});
