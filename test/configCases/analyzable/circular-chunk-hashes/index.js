import fs from "fs";
import path from "path";

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b] = await Promise.all([import("./a.js"), import("./b.js")]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
});

it("should bake one direction of the cycle and keep the other", () => {
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir).filter((n) => n.endsWith(".mjs"));
	const read = (prefix) =>
		fs.readFileSync(
			path.join(dir, /** @type {string} */ (names.find((n) => n.startsWith(prefix)))),
			"utf8"
		);
	const helper = `${"__webpack_require__"}.ei`;
	const baked = [read("a_js"), read("b_js")].filter((s) => s.includes(helper));
	// One of the pair bakes; the other keeps `.u` so no hash feeds back into it.
	expect(baked).toHaveLength(1);
	// Whatever it baked has to be a file that was actually emitted.
	for (const ref of baked[0].match(/"\.\/[^"]+\.mjs"/g) || []) {
		expect(names).toContain(ref.slice(3, -1));
	}
});
