import shiftJis from "./shift-jis.html";
import utf16 from "./utf-16.html";

const fs = require("fs");
const path = require("path");

const IMAGE = /<img src="[^"]+\.svg" alt="([^"]+)">/;

it("should keep a Shift_JIS page in its encoding", () => {
	const bytes = fs.readFileSync(path.join(__dirname, "shift-jis.html"));
	const text = new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
	expect(text).toContain("<title>日本語のページ</title>");
	expect(text).toContain("<p>こんにちは、世界</p>");
	expect(text).toMatch(IMAGE);
	expect(text.match(IMAGE)[1]).toBe("画像");
});

it("should keep a UTF-16 page in its encoding", () => {
	const bytes = fs.readFileSync(path.join(__dirname, "utf-16.html"));
	expect([bytes[0], bytes[1]]).toEqual([0xff, 0xfe]);
	const text = new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
	expect(text).toContain("<p>héllo — ✓</p>");
	expect(text).toMatch(IMAGE);
});

it("should export the characters of a page in another encoding", () => {
	expect(shiftJis).toContain("<p>こんにちは、世界</p>");
	expect(shiftJis.match(IMAGE)[1]).toBe("画像");
	expect(utf16).toContain("<p>héllo — ✓</p>");
});
