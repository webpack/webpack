import * as neighbor from "./neighbor.module.css";
import * as styles from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should repeat the whole name after the area's ident", () => {
	expect(styles.main).toBe("main_x-main");
	expect(styles["main-start"]).toBe("main_x-main-start");
	expect(styles["main-end"]).toBe("main_x-main-end");
	expect(css()).toContain("grid-column: main_x-main-start / main_x-main-end");
});

it("should keep an escape in the repeated name", () => {
	expect(styles["x.y"]).toBe("x.y_x-x.y");
	expect(css()).toContain("grid-area: x\\.y_x-x\\.y");
});

it("should export an imported grid name as its module does", () => {
	expect(neighbor.side).toBe("side_x-side");
	expect(styles.side).toBe(neighbor.side);
});

it("should inline an imported grid name the same way in every position", () => {
	expect(css()).toContain(`counter-reset: ${neighbor.side} 5`);
	expect(css()).toContain(`content: counter(${neighbor.side})`);
});
