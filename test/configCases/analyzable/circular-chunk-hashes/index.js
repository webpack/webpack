import fs from "fs";
import path from "path";

const CHUNK_REFERENCE = /"\.\/[^"]+\.mjs"/g;

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b] = await Promise.all([import("./a.js"), import("./b.js")]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
});

it("should name a mutually importing pair from one place", () => {
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

	// Neither chunk names the other, so neither content hash can chase the other —
	// the cycle the two used to form is not reachable at all.
	expect(read("a_js").match(CHUNK_REFERENCE)).toBe(null);
	expect(read("b_js").match(CHUNK_REFERENCE)).toBe(null);

	// The loader names both, and nothing names the chunk holding the loader.
	const bundle = read("bundle0");
	const referenced = bundle.match(CHUNK_REFERENCE) || [];

	expect(bundle).toContain(`${"chunkImports"} = {`);
	expect(referenced).toHaveLength(2);
	for (const ref of referenced) expect(names).toContain(ref.slice(3, -1));
});
