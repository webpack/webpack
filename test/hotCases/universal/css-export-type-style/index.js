import "./style.css";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./style.css"]);

it("should update CSS exportType 'style' in a universal target", (done) => {
	if (typeof document !== "undefined") {
		const styles = document.getElementsByTagName("style");
		expect(styles.length).toBeGreaterThan(0);
		expect(styles[styles.length - 1].textContent).toContain("color: red");
	}

	NEXT(
		update(done, true, () => {
			if (typeof document !== "undefined") {
				const styles = document.getElementsByTagName("style");
				expect(styles[styles.length - 1].textContent).toContain("color: green");
			}
			done();
		})
	);
});
