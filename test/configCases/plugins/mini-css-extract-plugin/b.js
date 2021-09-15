import "./b.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("b should load a chunk with css", () => {
	const linkStart = document.getElementsByTagName("link").length;
	const scriptStart = document.getElementsByTagName("script").length;
	const promise = import("./chunk");

	const links = document.getElementsByTagName("link").slice(linkStart);
	const scripts = document.getElementsByTagName("script").slice(scriptStart);

	expect(links.length).toBe(1);
	expect(scripts.length).toBe(1);
	links[0].onload({ type: "load" });
	__non_webpack_require__(
		scripts[0].src.replace("https://test.cases/path", ".")
	);

	return promise;
});

it("b should load a css chunk", () => {
	const linkStart = document.getElementsByTagName("link").length;
	const scriptStart = document.getElementsByTagName("script").length;
	const promise = import("./d.css");

	const links = document.getElementsByTagName("link").slice(linkStart);
	const scripts = document.getElementsByTagName("script").slice(scriptStart);

	expect(links.length).toBe(1);
	expect(scripts.length).toBe(1);
	links[0].onload({ type: "load" });
	__non_webpack_require__(
		scripts[0].src.replace("https://test.cases/path", ".")
	);

	const css = fs
		.readFileSync(
			path.resolve(
				__dirname,
				links[0].href.replace("https://test.cases/path", ".")
			),
			"utf-8"
		)
		.trim();
	expect(css).toMatchInlineSnapshot(`
		".dependency {
			color: red;
		}

		.d {
			color: red;
		}"
	`);

	return promise;
});

it("b should generate correct css", () => {
	const css = fs.readFileSync(path.resolve(__dirname, "b.css"), "utf-8").trim();
	expect(css).toMatchInlineSnapshot(`
		".b {
			color: red;
		}"
	`);
});
