const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const pageContent = typeof page === "string" ? page : "";

/** @type {{ file: string, nomodule: boolean }[]} */
const scripts = [];
const SRC = /src="([^"]+\.js)"( nomodule)?/g;
let match;
while ((match = SRC.exec(pageContent)) !== null) {
	scripts.push({ file: match[1], nomodule: match[2] !== undefined });
}

const read = (file) =>
	fs.readFileSync(path.resolve(__dirname, file), "utf-8");

it("should keep a nomodule script out of the classic run", () => {
	// Each script keeps its own chunk, in source order.
	expect(scripts.map((script) => script.nomodule)).toEqual([
		false,
		true,
		false
	]);
	const [a, b, c] = scripts.map((script) => read(script.file));
	expect(a).toContain("MARK_A");
	expect(a).not.toContain("MARK_B");
	expect(b).toContain("MARK_B");
	expect(b).not.toContain("MARK_C");
	expect(c).toContain("MARK_C");
});
