import fs from "fs";
import path from "path";

it("should place the module correctly", async () => {
	const { moduleA, moduleB, moduleC } = await import("./chunk");
	expect(fs.readFileSync(path.resolve(__dirname, "a.js"), "utf-8")).toContain(
		moduleA
	);
	expect(fs.readFileSync(path.resolve(__dirname, "b.js"), "utf-8")).toContain(
		moduleB
	);
	expect(
		fs.readFileSync(path.resolve(__dirname, "runtime.js"), "utf-8")
	).toContain(moduleC);
});
