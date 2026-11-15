import * as ns from "./module";
import * as reexported from "./reexport";
import * as reexportedCjs from "./reexport-cjs";
import { __proto__ as fromStar } from "./star-cjs";
import * as styles from "./style.module.css";

var hasOwn = function (object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
};

it("should export __proto__ as an own property from an ES module", function () {
	expect(hasOwn(ns, "__proto__")).toBe(true);
	expect(ns["__proto__"].flag).toBe(true);
	expect(ns.other).toBe(1);
	expect(hasOwn(reexported, "__proto__")).toBe(true);
	expect(reexported["__proto__"].flag).toBe(true);
	expect(hasOwn(reexportedCjs, "__proto__")).toBe(true);
	expect(reexportedCjs["__proto__"]).toBe(2);
	expect(fromStar).toBe(2);
});

it("should export __proto__ as an own property from a CSS module", function () {
	expect(hasOwn(styles, "__proto__")).toBe(true);
	expect(styles["__proto__"]).toBe("__proto__");
	expect(styles.other).toBe("other");
});
