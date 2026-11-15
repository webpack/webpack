import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should declare the encoding the chunk is written in, not the module's label", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css.startsWith('@charset "UTF-8";\n')).toBe(true);
	expect(css).not.toContain("ISO-8859-15");
	expect(css.match(/@charset/g)).toEqual(["@charset"]);
});
