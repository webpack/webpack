const fs = require("fs");
const path = require("path");

it("should list an entrypoint named __proto__ in the manifest", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(__dirname, "hints.json"), "utf8")
	);
	expect(Object.keys(manifest).sort()).toEqual(["__proto__", "main"]);
	expect(Array.isArray(manifest.__proto__)).toBe(true);
});
