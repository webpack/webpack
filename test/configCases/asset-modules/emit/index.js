import url from "../_images/file.png";
import url2 from "../_images/file.jpg";
import fs from "fs";
import path from "path";

it("should output asset with path", () => {
	expect(url).toEqual("images/file.png");
	expect(url2).toEqual("images/file.jpg");

	expect(fs.existsSync(path.join(__STATS__.outputPath, url))).toBe(false);
	expect(fs.existsSync(path.join(__STATS__.outputPath, url2))).toBe(true);
});
