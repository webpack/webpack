import * as styles from "./style.module.css";
import "./style.css";

it("should not run a script that a stylesheet composes from or imports", () => {
	expect(styles.base).toBeDefined();
	expect(global.composesScriptRan).toBe(undefined);
	expect(global.styleScriptRan).toBe(undefined);
});
