import png from "../_images/file.png?foo=bar";
import svg from "../_images/file.svg?";
import jpg from "../_images/file.jpg?foo=bar#hash";
import copy from "../_images/file_copy.png#hash";
import fs from "fs";

it("should output various asset types", () => {
	expect(png).toMatch(/^[\da-f]{20}\.png\?foo=bar$/);
	expect(svg).toMatch(/^[\da-f]{20}\.svg\?$/);
	expect(jpg).toMatch(/^[\da-f]{20}\.jpg\?foo=bar#hash$/);
	expect(copy).toMatch(/^[\da-f]{20}\.png#hash$/);

	const content = fs.readdirSync(__STATS__.outputPath);
	expect(content.filter((item) => /\.(jpg|png|svg)$/.test(item)).length).toBe(3);
});
