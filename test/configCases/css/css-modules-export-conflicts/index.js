import * as styles from "./style.module.css";

it("should give the class the JS export key when a custom property shares the name", () => {
	expect(styles["class-vs-var"]).toBe("class-vs-var");
	// Source order does not decide: `--var-then-class` is declared before `.var-then-class` but class still wins.
	expect(styles["var-then-class"]).toBe("var-then-class");
});

it("should give the class the JS export key when @keyframes / @counter-style / @container share the name", () => {
	expect(styles["class-vs-keyframes"]).toBe("class-vs-keyframes");
	expect(styles["class-vs-counter"]).toBe("class-vs-counter");
	expect(styles["class-vs-container"]).toBe("class-vs-container");
});

it("should give the class the JS export key when a grid line name shares the name", () => {
	expect(styles["class-vs-grid"]).toBe("class-vs-grid");
});

it("should preserve same-kind duplicate exports without warning", () => {
	expect(styles["dup-class"]).toBe("dup-class");
	expect(styles["dup-id"]).toBe("dup-id");
	expect(styles["dup-prop"]).toBe("--dup-prop");
	expect(styles["dup-kf"]).toBe("dup-kf");
	expect(styles["dup-val"]).toBe("blue");
	expect(styles["dup-export"]).toBe("b");
	expect(styles["dup-container"]).toBe("dup-container");
	expect(styles["dup-counter"]).toBe("dup-counter");
});
