import fs from "fs";
import path from "path";

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b, c] = await Promise.all([
		import("./a.js"),
		import("./b.js"),
		import("./c.js")
	]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
	expect(c.default).toBe(3);
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

it("should rename only what the repair touched", () => {
	const dir = __STATS__.outputPath;
	const before = JSON.parse(
		Buffer.from(
			fs.readFileSync(path.join(dir, "names-before-repair.txt"), "utf8"),
			"base64"
		).toString()
	);
	const after = fs.readdirSync(dir);
	const find = (list, prefix) => list.find((n) => n.startsWith(prefix));

	// The pair's names went stale with the fill, so both moved.
	expect(find(after, "a_js")).not.toBe(find(before, "a_js"));
	expect(find(after, "b_js")).not.toBe(find(before, "b_js"));
	// Nothing the fill touched reaches this one, so it keeps the name it was given.
	expect(find(after, "c_js")).toBe(find(before, "c_js"));
});
