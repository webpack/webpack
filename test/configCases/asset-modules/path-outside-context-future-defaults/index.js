import fs from "fs";
import path from "path";
import png from "../_images/file.png";
import svg from "../../../fixtures/file.svg";

/**
 * @param {string} url public url of the emitted asset
 * @returns {boolean} true when the asset was written inside output.path
 */
const emitted = (url) =>
	fs.existsSync(path.join(__STATS__.outputPath, url.slice("/public/".length)));

it("should contain [path] of a module outside of the context", () => {
	expect(png).toBe("/public/_/_images/file.png");
	expect(emitted(png)).toBe(true);
});

it("should contain [file] of a module outside of the context", () => {
	expect(svg).toBe("/public/_/_/_/fixtures/file.svg");
	expect(emitted(svg)).toBe(true);
});

it("should keep the real source path in the asset info", () => {
	const asset = __STATS__.assets.find((a) => a.name.endsWith("_images/file.png"));
	expect(asset.info.sourceFilename).toBe("../_images/file.png");
});
