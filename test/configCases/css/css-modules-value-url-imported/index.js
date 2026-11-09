import * as style from "./style.module.css";
import * as reexport from "./reexport.module.css";
import * as cycle from "./cycle-b.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const read = () =>
	fs.readFileSync(path.join(__dirname, `bundle${__STATS_I__}.css`), "utf-8");

const backgroundOf = (css, className) => {
	const match = new RegExp(
		`\\.[^\\s{]*${className} \\{\\s*background(?:-image)?: ([^;]+);`
	).exec(css);
	return match && match[1];
};

it("should resolve an imported url() value in the module that defines it", () => {
	expect(style["uses-bg"]).toMatch(/uses-bg$/);
	expect(reexport["uses-reexported-bg"]).toMatch(/uses-reexported-bg$/);
	expect(cycle["cycle-b"]).toMatch(/cycle-b$/);

	const css = read();
	const assets = fs
		.readdirSync(__dirname)
		.filter((file) => file.endsWith(".png"));

	if (URL_ENABLED) {
		expect(assets).toHaveLength(1);
		const url = `url(${assets[0]})`;
		expect(backgroundOf(css, "uses-bg")).toBe(url);
		expect(backgroundOf(css, "uses-quoted-bg")).toBe(url);
		expect(backgroundOf(css, "uses-local-alias")).toBe(url);
		expect(backgroundOf(css, "uses-alias-in-list")).toBe(`${url} no-repeat`);
		expect(backgroundOf(css, "uses-reexported-bg")).toBe(url);
		expect(backgroundOf(css, "cycle-b")).toBe(url);
	} else {
		expect(backgroundOf(css, "uses-bg")).toBe("url(./img/shape.png)");
		expect(backgroundOf(css, "uses-quoted-bg")).toBe('url("./img/shape.png")');
		expect(backgroundOf(css, "uses-reexported-bg")).toBe(
			"url(./img/shape.png)"
		);
	}
	expect(css).toMatch(/color: red;/);
	expect(css).toMatch(/color: blue;/);
});

it("should keep the exported values as written", () => {
	expect(style.bg).toBe("url(./img/shape.png)");
	expect(style.aliasBg).toBe("url(./img/shape.png)");
	expect(style.plain).toBe("red");
});
