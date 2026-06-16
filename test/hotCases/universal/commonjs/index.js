import cjs from "./cjs.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./cjs.js"]);

it("should update a CommonJS module imported into ESM in a universal target", (done) => {
	expect(cjs.value).toBe("cjs-1");

	NEXT(
		update(done, true, () => {
			import("./cjs.js")
				.then((updated) => {
					expect(updated.default.value).toBe("cjs-2");
					done();
				})
				.catch(done);
		})
	);
});
