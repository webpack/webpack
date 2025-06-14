import "./style.css";
import fs from "fs";
import path from "path";

it("creates source maps for .css output files by default", function() {
	const css = fs.readFileSync(path.resolve(__dirname, "style.css"), "utf-8");
	const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, "style.css.map"), "utf-8"));

	var match = /sourceMappingURL\s*=\s*(.*)\*\//.exec(css);
	expect(match[1]).toBe("style.css.map");
	expect(map).toHaveProperty("version", 3);
	expect(map).toHaveProperty("file", "style.css");
});