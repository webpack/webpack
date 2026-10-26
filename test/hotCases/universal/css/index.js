import * as styles from "./style.css";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./style.css"]);

it("should update CSS module locals in a universal target", (done) => {
	expect(typeof styles.foo).toBe("string");
	const initial = styles.foo;
	let original;
	if (typeof document !== "undefined") {
		original = document.getElementsByTagName("link")[0];
		expect(original.sheet.css).toContain("color: red;");
		original.setAttribute("media", "(prefers-color-scheme: dark)");
		original.setAttribute("data-theme", "dark");
		original.sheet.disabled = true;
	}

	NEXT(
		update(done, true, () => {
			if (typeof document !== "undefined") {
				const replacement = document.getElementsByTagName("link")[0];
				expect(replacement).not.toBe(original);
				expect(replacement.sheet.css).toContain("color: green;");
				expect(replacement.getAttribute("media")).toBe(
					"(prefers-color-scheme: dark)"
				);
				expect(replacement.getAttribute("data-theme")).toBe("dark");
				expect(replacement.sheet.disabled).toBe(true);
			}
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
