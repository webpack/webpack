import fs from "fs";
import path from "path";

const load = (name) => import(`./theme/${name}.css`);

it("should load a candidate whose chunk carries more than javascript", async () => {
	await load("dark");
	await load("light");

	const dir = __STATS__.children[__INDEX__].outputPath;

	// The stylesheet the imported chunk pulls in has to be emitted beside it.
	expect(fs.existsSync(path.join(dir, `${__NAME__}-theme_dark_css.css`))).toBe(
		true
	);
});

it("should keep dispatching the other chunk loading handlers", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	expect(bundle.split(`${"__webpack_require__"}.ei(`)).toHaveLength(3);
	// The css of the chunk rides on its own handler, which the baked import runs too.
	expect(bundle).toContain(`${"__webpack_require__"}.f.css =`);
	expect(bundle).toContain(`Object.keys(${"__webpack_require__"}.f).forEach(`);
});
