import fs from "fs";

it("should include all async imports in the main chunk", async () => {
	expect((await import("./async")).default).toEqual(42);
	expect((await (await import("./async")).nested()).default).toEqual(43);
	expect(fs.readFileSync(__filename, "utf-8")).toContain(
		"This is the async chunk"
	);
	expect(fs.readFileSync(__filename, "utf-8")).toContain(
		"This is the nested async chunk"
	);
});
