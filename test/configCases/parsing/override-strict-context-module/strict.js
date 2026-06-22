import fs from "fs";

it("should import", async () => {
	const n = "a.js";
	const { default: a1 } = await import(`./sub/${n}`);
	expect(typeof a1).toBe("function");
});

it("should not have iife for entry module when modules strict is different", () => {
	const code = fs.readFileSync(__filename, "utf-8");
	const iifeComment = [
		"This entry needs to be wrapped in an IIFE",
		"because it needs to be in strict mode."
	].join(" ");
	expect(code).not.toMatch(iifeComment);
});
