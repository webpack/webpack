import fs from "fs";
import path from "path";
import url from "../_images/file.png";

it("should emit the asset under the name the hook asked for", () => {
	expect(url).toBe("file.webp");
	expect(fs.existsSync(path.join(__STATS__.outputPath, "file.webp"))).toBe(
		true
	);
	expect(fs.existsSync(path.join(__STATS__.outputPath, "file.png"))).toBe(
		false
	);
});

it("should emit what the hook returned", () => {
	expect(
		fs.readFileSync(path.join(__STATS__.outputPath, url), "utf8")
	).toBe("webp-bytes");
});
