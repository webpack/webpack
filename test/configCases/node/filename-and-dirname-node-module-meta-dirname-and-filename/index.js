import path from "path";
import fs from "fs";

it("should use custom name", () => {
	expect(__dirname).toBe(__STATS__.outputPath);

	const bundleFile = path.join(__STATS__.outputPath, "./bundle0.mjs");

	expect(__filename).toBe(bundleFile);

	const content = fs.readFileSync(bundleFile, "utf8");

	expect(content.includes("custom.dirname")).toBe(true);
	expect(content.includes("custom.filename")).toBe(true);
});
