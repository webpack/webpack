import fs from "fs";
import path from "path";

// Referenced so both chunks exist; only loaded where they can be found.
const flat = () => import(/* webpackChunkName: "flat" */ "./flat");
const deep = () => import(/* webpackChunkName: "nested/deep" */ "./deep");

const stats = __STATS__.children[__INDEX__];
const specifier = (name) =>
	fs
		.readFileSync(path.join(stats.outputPath, __DIR__, name), "utf8")
		.match(/asset import \*\/ "([^"]+)"/)[1];

if (__DIGEST__) {
	it("should keep both chunks referenced", () => {
		expect(typeof flat).toBe("function");
		expect(typeof deep).toBe("function");
	});

	it("should walk back to the output root before the digest", () => {
		for (const [name, undo] of [
			["flat.mjs", "../"],
			["nested/deep.mjs", "../../"]
		]) {
			const match = new RegExp(`^${undo}media/([^/]+)/asset\\.txt$`).exec(
				specifier(name)
			);

			expect(match).not.toBe(null);
			// A digest re-encodes the hash, so decode it back to compare.
			const hex = Buffer.from(
				match[1].replace(/-/g, "+").replace(/_/g, "/"),
				"base64"
			).toString("hex");

			expect(hex.startsWith(stats.hash)).toBe(true);
		}
	});
} else {
	it("should resolve the asset from chunks at different depths", async () => {
		expect(fs.readFileSync((await flat()).url, "utf8")).toContain(
			"the asset content"
		);
		// Pull in the second, deeper copy so the module really sits at two depths.
		expect(fs.readFileSync((await deep()).url, "utf8")).toContain(
			"the asset content"
		);
	});

	it("should walk back to the output root before the public path", () => {
		expect(specifier("flat.mjs")).toBe("../asset.txt");
		expect(specifier("nested/deep.mjs")).toBe("../../asset.txt");
	});
}
