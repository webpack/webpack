import raw from "./raw.txt?raw";
// `file.png` is 14910 bytes (over the 8096 inline threshold).
import pngUrl from "../_images/file.png?url";
import pngInline from "../_images/file.png?inline";
// `file.svg` is 656 bytes (under the threshold, so auto-inlined by default).
import svgNoInline from "../_images/file.svg?no-inline";
import fs from "fs";
import path from "path";

it("should map ?raw to asset/source", () => {
	expect(raw).toBe("hello from raw.txt\n");
});

it("should map ?url to an emitted asset/resource", () => {
	expect(pngUrl.startsWith("data:")).toBe(false);
	// The emitted filename keeps the query, so drop it to find the file.
	const file = pngUrl.split("?")[0];
	expect(fs.existsSync(path.join(__STATS__.outputPath, file))).toBe(true);
});

it("should map ?inline to a data URI even above the inline threshold", () => {
	expect(pngInline.startsWith("data:image/png")).toBe(true);
});

it("should map ?no-inline to an emitted file even below the threshold", () => {
	expect(svgNoInline.startsWith("data:")).toBe(false);
	const file = svgNoInline.split("?")[0];
	expect(fs.existsSync(path.join(__STATS__.outputPath, file))).toBe(true);
});
