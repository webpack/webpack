import url from "../_images/file.png";
import fs from "fs";
import path from "path";

it("should emit asset with module.generator.asset.outputPath", () => {
	expect(url).toEqual("https://cdn/assets/file.png");

	const emitPath = path.join(__STATS__.outputPath, "cdn-assets/file.png")
	expect(fs.existsSync(emitPath)).toBe(true);
});
