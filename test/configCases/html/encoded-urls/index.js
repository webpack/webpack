import page from "./page.html";
import base from "./base.html";
import external from "./external.html";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} url emitted asset URL
 * @returns {string} emitted asset content
 */
const readAsset = url => {
	const parsed = new URL(url, "https://example.test/");
	return fs.readFileSync(path.join(__dirname, parsed.pathname), "utf-8").trim();
};

it("should decode asset paths in src and srcset exactly once", () => {
	const sources = [];
	const expression = /<img src="([^"]+)"/g;
	let match;
	while ((match = expression.exec(page))) sources.push(match[1]);
	expect(sources.map(readAsset)).toEqual(["space", "hash", "percent", "encoded"]);
	const srcset = page.match(/srcset="([^"]+)"/)[1];
	expect(srcset.split(", ").map(candidate => readAsset(candidate.split(" ")[0])))
		.toEqual(["space", "hash"]);
});

it("should preserve encoded queries and fragments", () => {
	const source = page.match(/<img src="([^"]+)" id="fragment"/)[1];
	const parsed = new URL(source.replace(/&amp;/g, "&"), "https://example.test/");
	expect(parsed.search).toBe("?query=%23%20&v=%2523");
	expect(parsed.hash).toBe("#icon%20name");
});

it("should decode asset paths after resolving the document base", () => {
	const source = base.match(/<img src="([^"]+)"/)[1];
	expect(readAsset(source)).toBe("space");
});

it("should match encoded external requests and preserve data URLs", () => {
	const source = external.match(/src="(data:image[^"]+)"/)[1];
	expect(source).toBe("data:image/svg+xml,%3Csvg%3E%3C/svg%3E");
});
