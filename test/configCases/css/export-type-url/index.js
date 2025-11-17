import { "url-class" as urlClass } from "./url.css";

it("should export URL string when exportType is url", () => {
	expect(typeof urlClass).toBe("string");
});

it("should export URL string when exportType is URL", () => {
	const urlCss = new URL("./url.css", import.meta.url);

	expect(urlCss.href).toMatch(/\.css$/);
	expect(urlCss.href).toMatch(/bundle\.main\.[a-f0-9]+\.css$/);

	// Extract filename from URL
	const match = urlCss.href.match(/bundle\.main\.[a-f0-9]+\.css$/);
	expect(match).toBeTruthy();
	const cssFilename = match[0];

	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(__dirname + `/${cssFilename}`, "utf-8");
	expect(source).toMatchSnapshot();
});

it("should export URL string when exportType is URL", () => {
	const urlCss = new URL("./other.css", import.meta.url);

	expect(urlCss.href).toMatch(/\.css$/);
	expect(urlCss.href).toMatch(/bundle\.main\.[a-f0-9]+\.css$/);

	// Extract filename from URL
	const match = urlCss.href.match(/bundle\.main\.[a-f0-9]+\.css$/);
	expect(match).toBeTruthy();
	const cssFilename = match[0];

	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(__dirname + `/${cssFilename}`, "utf-8");
	expect(source).toMatchSnapshot();
});

it("should export URL string when exportType is url and DATA URI is CSS", () => {
	const urlCss = new URL("data:text/css;charset=utf-8,%40import%20url%28%22.%2Furl-imported.css%22%29%3B%0D%0A%0D%0A.url-class%20%7B%0D%0A%09background%3A%20url%28%22.%2Fimg.png%22%29%3B%0D%0A%09color%3A%20teal%3B%0D%0A%09margin%3A%2010px%3B%0D%0A%7D", import.meta.url);

	expect(urlCss.href).toMatch(/\.css$/);
	expect(urlCss.href).toMatch(/bundle\.main\.[a-f0-9]+\.css$/);

	// Extract filename from URL
	const match = urlCss.href.match(/bundle\.main\.[a-f0-9]+\.css$/);
	expect(match).toBeTruthy();
	const cssFilename = match[0];

	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(__dirname + `/${cssFilename}`, "utf-8");
	expect(source).toMatchSnapshot();
});


