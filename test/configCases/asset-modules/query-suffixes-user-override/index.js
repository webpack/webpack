import raw from "../query-suffixes/raw.txt?raw";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

it("should let a user ?raw rule override the futureDefaults default", () => {
	// The default maps ?raw to asset/source (a string); the user rule here
	// remaps it to asset/resource, so we get an emitted URL instead.
	expect(raw.startsWith("data:")).toBe(false);
	expect(raw).not.toBe("hello from raw.txt\n");
	const file = raw.split("?")[0];
	// ESM output resolves an `auto` public path against `import.meta.url`.
	const asset = file.startsWith("file:")
		? fileURLToPath(file)
		: path.join(__STATS__.outputPath, file);
	expect(fs.existsSync(asset)).toBe(true);
});
