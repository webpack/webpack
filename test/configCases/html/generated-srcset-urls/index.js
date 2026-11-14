import page from "./page.html";

const { decodeEntities, parseSrcset } = require("webpack").html.syntax.parser;

it("should keep generated URLs within their srcset candidates", () => {
	const candidates = [];
	const descriptors = [];
	const attributes = /(?:srcset|imagesrcset)=(?:"([^"]*)"|'([^']*)'|([^\t\n\f\r >]+))/g;
	let match;
	while ((match = attributes.exec(page))) {
		const value = decodeEntities(match[1] || match[2] || match[3], true);
		const parsed = parseSrcset(value);
		candidates.push(parsed.map(candidate => candidate[0]));
		descriptors.push(parsed.map((candidate, index) =>
			value.slice(candidate[2], parsed[index + 1] && parsed[index + 1][1])
				.trim().replace(/,$/, "").trim()
		));
	}
	expect(candidates).toEqual([
		["my%20image.svg", "asset%2C%2C"],
		["my%20image.svg", "asset%2C%2C"],
		["%2C%2Cimage.svg", "wide,tall.svg"],
		["/a%09b%0Ac%0Cd%0De%20f.svg", "/already%20encoded.svg"],
		["/a\u00a0b.svg", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"],
		["%2C%2Cimage.svg"],
		["data:"],
		["data:text/plain,value%2C"]
	]);
	expect(descriptors).toEqual([
		["480w", "800w"],
		["1x", "2x"],
		["480w", "800w"],
		["1x", "2x"],
		["1x", "2x"],
		[""],
		[""],
		["2x"]
	]);
});

it("should retain ordinary source URL escaping", () => {
	expect(page).toContain('src="my image.svg"');
});
