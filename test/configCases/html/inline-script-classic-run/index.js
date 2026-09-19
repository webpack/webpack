const fs = require("fs");
const path = require("path");

const page = require("./page.html");

// The HTML module type is opaque to static analysis, so the imported page is
// normalized to a concrete string once.
const pageContent = typeof page === "string" ? page : "";

const readChunk = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const collectMatches = (str, regex) => {
	const out = [];
	let match;
	while ((match = regex.exec(str)) !== null) out.push(match[1]);
	return out;
};

it("should merge only tags a classic script runs straight through", () => {
	expect(pageContent).toMatchSnapshot();

	const urls = collectMatches(
		pageContent,
		/<script src="(page\d*\.js)"><\/script>/g
	);
	// The first two tags have only a comment between them, so they share a
	// chunk. The third stands after markup its body could read, so it does not.
	expect(urls).toHaveLength(2);

	const merged = readChunk(urls[0]);
	expect(merged).toContain("adjacent-1");
	expect(merged).toContain("adjacent-2");
	expect(merged.indexOf("adjacent-1")).toBeLessThan(
		merged.indexOf("adjacent-2")
	);
	expect(merged).not.toContain("after-markup");

	const last = readChunk(urls[1]);
	expect(last).toContain("after-markup");
	// Classic output emits classic chunks, so the tags keep classic semantics.
	expect(pageContent).not.toMatch(/<script[^>]*\btype="module"/);
});
