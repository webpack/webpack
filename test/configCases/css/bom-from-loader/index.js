import "./first.css";
import "./second.css";
import * as styles from "./third.module.css";

const BOM = "\uFEFF";

it("should still scope a css module whose loader added a BOM", () => {
	expect(styles.third).toBeDefined();
	expect(styles.third).not.toContain(BOM);
});
