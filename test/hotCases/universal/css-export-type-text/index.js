import text from "./style.css";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./style.css"]);

it("should update CSS exportType 'text' in a universal target", (done) => {
	expect(typeof text).toBe("string");
	expect(text).toContain("color: red");

	NEXT(
		update(done, true, () => {
			import("./style.css")
				.then((updated) => {
					expect(updated.default).toContain("color: green");
					done();
				})
				.catch(done);
		})
	);
});
