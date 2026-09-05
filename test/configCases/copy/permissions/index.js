const fs = require("fs");
const path = require("path");

const mode = (name) =>
	fs.statSync(path.resolve(__dirname, name)).mode & 0o777;

it("should keep the permissions of the file it copied", () => {
	expect(mode("kept/run.sh")).toBe(0o755);
	expect(mode("kept/plain.txt")).toBe(0o644);
});

it("should give a copied file the default permissions otherwise", () => {
	expect(mode("default/run.sh") & 0o111).toBe(0);
});
