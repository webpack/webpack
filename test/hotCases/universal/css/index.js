import * as styles from "./style.css";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./style.css"]);

it("should update CSS module locals in a universal target", (done) => {
	expect(typeof styles.foo).toBe("string");
	const initial = styles.foo;

	NEXT(
		update(done, true, () => {
			import("./style.css")
				.then((updated) => {
					expect(typeof updated.foo).toBe("string");
					expect(updated.foo).toBe(initial);
					done();
				})
				.catch(done);
		})
	);
});
