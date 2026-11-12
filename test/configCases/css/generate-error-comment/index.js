import fs from "fs";
import path from "path";

it("keeps the error message inside the comment it is written into", () => {
	try {
		require("./style.css");
	} catch (_err) {
		// the module throws its build error when required
	}
	const name = fs.readdirSync(__dirname).find((f) => f.endsWith(".css"));
	const css = fs.readFileSync(path.join(__dirname, name), "utf-8");
	expect(css).toContain(".x{color:red}");
	// Nothing is left once the comments are taken out.
	expect(css.replace(/\/\*[\s\S]*?\*\//g, "").trim()).toBe("");
});
