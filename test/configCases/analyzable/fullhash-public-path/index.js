import fs from "fs";
import path from "path";

const url = new URL("./asset.txt", import.meta.url);

it("should bake a public path built from the compilation hash", () => {
	const { hash } = __STATS__;
	expect(url.href).toContain(`/cdn/${hash}/asset.txt`);

	const entry = __STATS__.assets.find((asset) =>
		asset.name.startsWith("bundle0.")
	).name;
	const source = fs.readFileSync(path.join(__STATS__.outputPath, entry), "utf8");
	// The literal spells this build's own hash, and nothing reads it at runtime.
	expect(source).toContain(`"/cdn/${hash}/asset.txt"`);
	expect(source).not.toContain(`${"__webpack_require__"}.p +`);
});
