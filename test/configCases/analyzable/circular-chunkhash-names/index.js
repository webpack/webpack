import fs from "fs";
import path from "path";

const CHUNK_REFERENCE = /"\.\/[^"]+\.mjs"/g;

it("should build rather than deadlock on two chunks that name each other", async () => {
	const [a, b] = await Promise.all([import("./a.js"), import("./b.js")]);
	expect(a.default).toBe(1);
	expect(b.default).toBe(2);
});

it("should name a mutually importing pair without repairing either", () => {
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir).filter((n) => n.endsWith(".mjs"));
	const emitted = (prefix) =>
		/** @type {string} */ (names.find((n) => n.startsWith(prefix)));
	const read = (prefix) =>
		fs.readFileSync(path.join(dir, emitted(prefix)), "utf8");

	// Neither names the other, so nothing has to be repaired from what the fill left
	// — which `[chunkhash]` could not have been, since it never reads a fill.
	expect(read("a_js").match(CHUNK_REFERENCE)).toBe(null);
	expect(read("b_js").match(CHUNK_REFERENCE)).toBe(null);

	const bundle = read("bundle0");

	expect(bundle).toContain(`${"chunkImports"} = {`);
	for (const prefix of ["a_js", "b_js"]) {
		expect(bundle).toContain(`"./${emitted(prefix)}"`);
	}

	// The hash in each name is the one the asset's info carries.
	for (const prefix of ["a_js", "b_js"]) {
		const name = emitted(prefix);
		const asset = __STATS__.assets.find((a) => a.name === name);

		expect(asset.info.chunkhash).toBe(name.split(".")[1]);
	}
});
