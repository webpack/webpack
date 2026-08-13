import fs from "fs";
import path from "path";

it("should keep the runtime form so the chunkhash name cannot go stale", async () => {
	const mod = await import("./lazy.js");
	expect(mod.default).toBe("lazy");
	const dir = __STATS__.outputPath;
	const entry = fs.readdirSync(dir).find((n) => n.startsWith("bundle0."));
	const source = fs.readFileSync(path.join(dir, entry), "utf8");
	// The whole point: no baked literal, so `.u` still ties the names together.
	expect(source).not.toContain(`${"__webpack_require__"}.ei`);
	expect(source).toContain(`${"__webpack_require__"}.u`);
});
