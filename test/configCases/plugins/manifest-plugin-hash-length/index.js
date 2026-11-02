import fs from "fs";
import path from "path";

it("should remove a hash longer than 32 characters from asset names", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, MANIFEST), "utf-8")
	);

	expect(manifest.assets["third.js"].file).toBe(
		`third.${"a1".repeat(HASH_LENGTH / 2)}.js`
	);
});
