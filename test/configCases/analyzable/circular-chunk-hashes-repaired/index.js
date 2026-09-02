import fs from "fs";
import path from "path";

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b] = await Promise.all([import("./a.js"), import("./b.js")]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
});

it("should bake both directions of the cycle under repaired names", () => {
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir).filter((n) => n.endsWith(".mjs"));
	const emitted = (prefix) =>
		/** @type {string} */ (names.find((n) => n.startsWith(prefix)));
	const read = (prefix) =>
		fs.readFileSync(path.join(dir, emitted(prefix)), "utf8");
	const helper = `${"__webpack_require__"}.ei`;

	// Both bake, and the repair re-hashes the pair as one group: each spells exactly
	// the name the other was emitted under.
	expect(read("a_js")).toContain(`${helper}(`);
	expect(read("a_js")).toContain(`"./${emitted("b_js")}"`);
	expect(read("b_js")).toContain(`${helper}(`);
	expect(read("b_js")).toContain(`"./${emitted("a_js")}"`);
});
