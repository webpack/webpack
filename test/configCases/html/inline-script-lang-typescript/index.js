const fs = require("fs");
const path = require("path");

it("should strip the types of a <script lang=\"ts\"> body with no configuration", () => {
	const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	const match = /<script src="([^"]+)" lang="ts"><\/script>/.exec(page);
	expect(match).not.toBeNull();
	const script = fs.readFileSync(path.resolve(__dirname, match[1]), "utf-8");
	expect(script).toMatch(/\.\/inline\.[\da-f]{16}\.ts/);
	expect(script).toContain("window.inlineTypeScriptAnswer = answer");
	expect(script).not.toContain(": number");
	expect(script).toContain("value * 2");
});
