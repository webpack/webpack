import fs from "fs";
import path from "path";

it("should include all async imports in the main chunk", async () => {
	expect((await import("./async")).default).toEqual(42);
	expect((await (await import("./async")).nested()).default).toEqual(43);
	expect(fs.readFileSync(path.join(__output_dirname__, 'b.js'), "utf-8")).toContain(
		"This is the async chunk"
	);
	expect(fs.readFileSync(path.join(__output_dirname__, 'b.js'), "utf-8")).toContain(
		"This is the nested async chunk"
	);
});
