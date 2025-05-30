import { foo } from "./foo.js";

let generated = /** @type {string} */ (
	__non_webpack_require__("fs").readFileSync(__filename, "utf-8")
);

it("should work", () => {
	let idx = 0;
	let count = 0;
	while (idx < generated.length) {
		let found = generated.indexOf("/* unused pure expression or super */", idx);
		if (
			found !== -1 &&
			// Skip the indexOf call on line 11
			generated[found - 1] === "("
		) {
			count++;
			idx = found + 37;
		} else break;
	}
	expect(count).toBe(3);
	expect(foo).toBe("foo");
	expect(global.foo).toBe("foo");
});
