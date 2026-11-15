import * as styles from "./style.module.css";

it("should export a class named __proto__ as an own property", () => {
	expect(Object.prototype.hasOwnProperty.call(styles, "__proto__")).toBe(true);
	expect(styles.__proto__).toBe("__proto__");
	expect(styles.other).toBe("other");
});

it("should export a class named __proto__ from a dynamically imported module", () =>
	import("./style.module.css").then((dynamic) => {
		expect(Object.prototype.hasOwnProperty.call(dynamic, "__proto__")).toBe(true);
		expect(dynamic.__proto__).toBe("__proto__");
	}));
