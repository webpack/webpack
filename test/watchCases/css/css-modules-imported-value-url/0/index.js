import * as style from "./style.module.css";
import * as reexport from "./reexport.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should write the current asset URL of an imported url() value", () => {
	expect(style["uses-bg"]).toMatch(/uses-bg$/);
	expect(reexport["uses-reexported-bg"]).toMatch(/uses-reexported-bg$/);
	const name = WATCH_STEP === "3" ? "other" : "image";
	const asset = STATS_JSON.assets.find((a) =>
		new RegExp(`^${name}\\.[0-9a-f]+\\.txt$`).test(a.name)
	);
	expect(asset).toBeDefined();
	const css = fs.readFileSync(path.join(__dirname, "main.css"), "utf-8");
	const url = `background-image: url(${asset.name});`;
	expect(css.split(url)).toHaveLength(3);
	const tone = WATCH_STEP === "2" || WATCH_STEP === "3" ? "blue" : "red";
	expect(css).toContain(`color: ${tone};`);
	expect(style.tone).toBe(tone);
	expect(reexport.tone).toBe(tone);
});
