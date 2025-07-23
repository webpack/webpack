import path from "path";

it("should use custom name", () => {
	expect(__dirname).toBe(__STATS__.outputPath);
	expect(__filename).toBe(path.join(__STATS__.outputPath, "./bundle0.js"));
});
