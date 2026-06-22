import "./style.css";
import * as styles from "./shared.module.css";

it("should expose css module locals to JS after incremental rebuild", () => {
	expect(styles.foo).toBeTruthy();
});
