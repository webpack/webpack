import * as styles from "./style.css";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./style.css"]);

// SSR registry lives on globalThis, namespaced by uniqueName
function collectedCss() {
	const key = Object.keys(globalThis).find((k) =>
		k.startsWith("__webpack_css__")
	);
	return key ? globalThis[key] : undefined;
}

it("should refresh the node SSR style registry on CSS hot update", (done) => {
	const initial = styles.foo;
	expect(typeof initial).toBe("string");

	NEXT(
		update(done, true, () => {
			import("./style.css")
				.then((updated) => {
					// CSS module locals stay stable across the update on both platforms
					expect(updated.foo).toBe(initial);
					if (typeof document === "undefined") {
						// node: the re-emitted CSS file is read back into the SSR registry
						const registry = collectedCss();
						expect(registry).toBeTruthy();
						expect(Object.values(registry).join("\n")).toContain(
							"color: green"
						);
					}
					done();
				})
				.catch(done);
		})
	);
});
