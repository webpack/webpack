import { describe, labelled, shapes, strings, template } from "./module";

it("should run what the printer wrote", () => {
	expect(describe(3)).toBe("odd:3");
	expect(describe(4)).toBe("even:4");
	expect(labelled()).toEqual([0, 0, 1, 0, 1]);
	expect(shapes()).toEqual({ a: 1, "b-c": 2, d: [1, 2], e: "x" });
	expect(strings()).toEqual(["a\"b", "c'd", "</script>", " ", "\0" + "1", "é"]);
	expect(template("x")).toBe("<x>${y}\n");
});

it("should have minified the bundle", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf8");
	expect(source).not.toContain("should run what the printer wrote\",\n");
	expect(source).not.toMatch(/\n\t+expect/);
});
