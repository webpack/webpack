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

it("should remove the recorded content hash whatever its length or digest", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, MANIFEST), "utf-8")
	);

	expect(manifest.assets["page.html"].file).toBe("page.Ab-c_1z9.html");
	expect(manifest.assets["twice.html"].file).toBe(
		"twice.Ab-c_1z9.Ab-c_1z9.html"
	);
});
