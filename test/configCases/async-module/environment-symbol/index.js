import fs from "fs";

it("should respect environment.symbol in the async module runtime", async () => {
	const { a } = await import("./a");
	expect(a).toBe("a");
	const source = fs.readFileSync(__filename, "utf-8");
	// string split to not match this test's own source
	expect(source.includes("has" + "Symbol ? Symbol(")).toBe(!SUPPORTS_SYMBOL);
});
