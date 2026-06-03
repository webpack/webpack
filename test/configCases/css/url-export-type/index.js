import "./via-url.css";

it("should return a URL pointing to a generated CSS file", () => {
	const url = new URL("./style.css", import.meta.url);

	expect(url.href).toMatch(/\.css$/);
});

it("should emit the bundled CSS (with @import inlined) as a standalone file", () => {
	const url = new URL("./style.css", import.meta.url);
	const filename = url.href.slice(url.href.lastIndexOf("/") + 1);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(path.join(__dirname, filename), "utf-8");

	expect(source).toContain(".url-class");
	expect(source).toContain(".url-imported");
});

it("should also handle a data:text/css URL", () => {
	const url = new URL("data:text/css,.a%7Bcolor:red%7D", import.meta.url);
	const filename = url.href.slice(url.href.lastIndexOf("/") + 1);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(path.join(__dirname, filename), "utf-8");

	expect(source).toContain(".a{color:red}");
});

it("should bundle a CSS file referenced via url() into its own chunk", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".css"));

	// The CSS that contains `url(./via-url-target.css)` rewrites it to the
	// bundled chunk's filename, not the raw `via-url-target.css` source name.
	const viaSource = files
		.map((f) => fs.readFileSync(path.join(__dirname, f), "utf-8"))
		.find((s) => s.includes(".via {"));
	expect(viaSource).toBeDefined();
	const match = viaSource.match(/url\(([^)]+\.css)\)/);
	expect(match).toBeTruthy();

	const targetSource = fs.readFileSync(
		path.join(__dirname, match[1]),
		"utf-8"
	);
	expect(targetSource).toContain(".via-target");
});
