import * as mixed from "./const-then-function.js";
import * as mixedDefault from "./default-then-function.js";
import * as ordered from "./function-then-const.js";

const fs = __non_webpack_require__("fs");
const generated = /** @type {string} */ (
	fs.readFileSync(__filename, "utf-8")
);

it("should list namespace keys in code-unit order when mixing const and getter exports", () => {
	// ECMA-262 module namespace [[OwnPropertyKeys]] sorts the string keys
	expect(Object.keys(mixed).join()).toBe("a,z");
	expect(Object.keys(mixedDefault).join()).toBe("default,z");
	expect(Object.keys(ordered).join()).toBe("a,z");
	expect(mixed.a).toBe(1);
	expect(mixed.z()).toBe(undefined);
	expect(mixedDefault.default).toBe(1);
	expect(ordered.a()).toBe(undefined);
	expect(ordered.z).toBe(1);
});

it("should emit the value format only when it registers in sorted order", () => {
	if (CONCATENATED) return; // a concatenated module registers exports in its root scope
	// Each module block is inspected separately, so the assertions below never
	// match this entry module's own code
	const blocks = generated.split("/***/ ");
	const blockOf = (name) =>
		blocks.find((block) => block.startsWith(`"${name}"`)) || "";
	const mixedBlock = blockOf("./const-then-function.js");
	const defaultBlock = blockOf("./default-then-function.js");
	const orderedBlock = blockOf("./function-then-const.js");
	// "a"/"default" sort before a getter key of their module: emitted as getters
	expect(mixedBlock.includes("a: () => (")).toBe(true);
	expect(mixedBlock.includes("z: () => (")).toBe(true);
	expect(mixedBlock.includes(", 0,")).toBe(false);
	expect(defaultBlock.includes(", 0,")).toBe(false);
	// "z" of function-then-const.js sorts after every getter key: value format kept
	expect(orderedBlock.includes('"z", 0,')).toBe(true);
});
