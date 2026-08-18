import fs from "fs";
import path from "path";

// Referenced so both chunks exist; only loaded where they can be found.
const flat = () => import(/* webpackChunkName: "flat" */ "./flat");
const deep = () => import(/* webpackChunkName: "nested/deep" */ "./deep");
// The host loads the entry rather than webpack, so this one is outside the public path.
export const own = new URL("./asset.txt", import.meta.url);

const stats = __STATS__.children[__INDEX__];
const read = (...parts) =>
	fs
		.readFileSync(path.join(stats.outputPath, ...parts), "utf8")
		.match(/asset import \*\/ "([^"]+)"/)[1];
const specifier = (name) => read(__DIR__, name);
const entry = () => read(`bundle${__INDEX__}.mjs`);

if (__DIGEST__) {
	it("should keep both chunks referenced", () => {
		expect(typeof flat).toBe("function");
		expect(typeof deep).toBe("function");
	});

	it("should walk back to the output root before the digest", () => {
		const match = /^\.\/media\/([^/]+)\/asset\.txt$/.exec(entry());

		expect(match).not.toBe(null);
		// A digest re-encodes the hash, so decode it back to compare.
		const hex = Buffer.from(
			match[1].replace(/-/g, "+").replace(/_/g, "/"),
			"base64"
		).toString("hex");

		expect(hex.startsWith(stats.hash)).toBe(true);
	});

	it("should leave the digest out of the chunks it already names", () => {
		expect(specifier("flat.mjs")).toBe("../asset.txt");
		expect(specifier("nested/deep.mjs")).toBe("../../asset.txt");
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
		expect(entry()).toBe("./asset.txt");
	});
}
