import fs from "fs";
import path from "path";
import png from "../_images/file.png";
import txt from "../../../fixtures/abc.txt";
import local from "./local.txt";
import svg from "../../../fixtures/file.svg";

/**
 * @param {string} url public url of the emitted asset
 * @returns {boolean} true when the asset was written inside output.path
 */
const emitted = (url) =>
	fs.existsSync(
		path.join(__STATS__.outputPath, url.slice("/public/".length))
	);

it("should replace parent segments of [containedpath] with _", () => {
	expect(png).toBe("/public/_/_images/file.png");
	expect(txt).toBe("/public/_/_/_/fixtures/abc.txt");
	expect(emitted(png)).toBe(true);
	expect(emitted(txt)).toBe(true);
});

it("should keep [containedpath] empty for a file in the context", () => {
	expect(local).toBe("/public/local.txt");
	expect(emitted(local)).toBe(true);
});

it("should replace parent segments of [containedfile] with _", () => {
	expect(svg).toBe("/public/_/_/_/fixtures/file.svg");
	expect(emitted(svg)).toBe(true);
});
