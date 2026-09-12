import fs from "fs";
import path from "path";

const CHUNK_REFERENCE = /"\.\/[^"]+\.mjs"/g;

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

it("should name a mutually importing pair from one place", () => {
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir).filter((n) => n.endsWith(".mjs"));
	const emitted = (prefix) =>
		/** @type {string} */ (names.find((n) => n.startsWith(prefix)));
	const read = (prefix) =>
		fs.readFileSync(path.join(dir, emitted(prefix)), "utf8");

	// Neither names the other, so with `realContentHash` off there is still no pair
	// of names chasing each other to re-hash as one group.
	expect(read("a_js").match(CHUNK_REFERENCE)).toBe(null);
	expect(read("b_js").match(CHUNK_REFERENCE)).toBe(null);

	const bundle = read("bundle0");
	const start = bundle.indexOf(`${"chunkImports"} = {`);

	expect(start).not.toBe(-1);
	// Read inside the map, so a name cannot be matched from anywhere else in the chunk.
	const region = bundle.slice(start, bundle.indexOf("};", start));

	for (const prefix of ["a_js", "b_js", "c_js"]) {
		expect(region).toContain(`"./${emitted(prefix)}"`);
	}
});

it("should need no repair at all", () => {
	const dir = __STATS__.outputPath;
	const before = JSON.parse(
		Buffer.from(
			fs.readFileSync(path.join(dir, "names-before-repair.txt"), "utf8"),
			"base64"
		).toString()
	);
	const after = fs.readdirSync(dir);
	const find = (list, prefix) => list.find((n) => n.startsWith(prefix));

	// The fill only ever lands in the chunk holding the loader, whose own name reads
	// no hash — so no name goes stale and nothing has to be renamed after it.
	for (const prefix of ["a_js", "b_js", "c_js"]) {
		expect(find(after, prefix)).toBe(find(before, prefix));
	}
});
