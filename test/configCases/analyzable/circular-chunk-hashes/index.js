import fs from "fs";
import path from "path";

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b] = await Promise.all([import("./a.js"), import("./b.js")]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
});

it("should bake both directions of the cycle", () => {
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir).filter((n) => n.endsWith(".mjs"));
	const read = (prefix) =>
		fs.readFileSync(
			path.join(
				dir,
				/** @type {string} */ (names.find((n) => n.startsWith(prefix)))
			),
			"utf8"
		);
	const helper = `${"__webpack_require__"}.ei`;
	const baked = [read("a_js"), read("b_js")].filter((s) => s.includes(helper));
	// Both bake: the repair re-hashes the pair as one group, so each name on disk is
	// the one the other file spells.
	expect(baked).toHaveLength(2);
	for (const source of baked) {
		for (const ref of source.match(/"\.\/[^"]+\.mjs"/g) || []) {
			expect(names).toContain(ref.slice(3, -1));
		}
	}
});
