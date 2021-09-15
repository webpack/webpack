const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

it("should result in the correct HTML", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "index.html"),
		"utf-8"
	);

	// check minimized
	expect(content).toMatch(/<\/script> <script/);

	// check inlined js is minimized
	expect(content).toMatch(/For license information please see inline-/);

	// contains references to normal-[contenthash].js
	expect(content).toMatch(/normal-.{20}\.js/);

	const [filename] = /normal-.{20}\.js/.exec(content);
	const normalJs = fs.readFileSync(path.resolve(__dirname, filename));
	const hash = crypto.createHash("sha512");
	hash.update(normalJs);
	const digest = hash.digest("base64");

	// SRI has been updated and matched content
	expect(content).toContain(digest);
});
