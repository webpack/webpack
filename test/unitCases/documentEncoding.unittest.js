"use strict";

// eslint-disable-next-line n/prefer-global/text-decoder
const { TextDecoder } = require("util");
const {
	encodeDocument,
	escapeCssCodePoint,
	escapeHtmlCodePoint,
	escapeJsCodePoint,
	fromDocument,
	fromDocumentWithMap,
	toDocument
} = require("../../lib/html/documentEncoding");

/**
 * @param {string} encoding an encoding
 * @returns {boolean} whether the runtime decodes it (full ICU)
 */
const decodes = (encoding) => {
	try {
		return new TextDecoder(encoding).encoding === encoding;
	} catch (_err) {
		return false;
	}
};

const describeIf = decodes("shift_jis") ? describe : describe.skip;

describeIf("documentEncoding", () => {
	it("should read and write the characters of a page", () => {
		// "日本" in Shift_JIS, one character per byte
		const text = Buffer.from([0x93, 0xfa, 0x96, 0x7b]).toString("latin1");
		expect(fromDocument(text, "shift_jis")).toBe("日本");
		expect(toDocument("日本", "shift_jis", escapeHtmlCodePoint)).toBe(text);
		expect(toDocument("€", "windows-1252", escapeHtmlCodePoint)).toBe("\u0080");
	});

	it("should escape a character the encoding lacks for where it goes", () => {
		expect(toDocument("é😀", "shift_jis", escapeHtmlCodePoint)).toBe(
			"&#xe9;&#x1f600;"
		);
		expect(toDocument("é", "shift_jis", escapeCssCodePoint)).toBe("\\e9 ");
		expect(toDocument("😀", "shift_jis", escapeJsCodePoint)).toBe(
			"\\ud83d\\ude00"
		);
	});

	it("should keep a character a step put there", () => {
		expect(fromDocument("\u0080 €", "windows-1252")).toBe("€ €");
		expect([...encodeDocument("\u0080 日", "shift_jis")]).toEqual([
			0x80, 0x20, 0x93, 0xfa
		]);
	});

	it("should map each character back to its bytes", () => {
		const text = Buffer.from([0x61, 0x93, 0xfa, 0x62]).toString("latin1");
		expect(fromDocumentWithMap(text, "shift_jis")).toEqual({
			text: "a日b",
			map: [0, 1, 3, 4]
		});
		expect(fromDocumentWithMap("abc", "shift_jis")).toEqual({
			text: "abc",
			map: undefined
		});
	});

	it("should decode a page whose ASCII bytes switch to Japanese", () => {
		// "日本" in ISO-2022-JP: an escape, then each character as two ASCII bytes
		const text = "\u001B$BF|K\\\u001B(B";
		expect(fromDocument(text, "iso-2022-jp")).toBe("日本");
		expect(fromDocumentWithMap(text, "iso-2022-jp").text).toBe("日本");
		expect(fromDocument("plain", "iso-2022-jp")).toBe("plain");
	});

	it("should leave a UTF-16 page's characters as they are", () => {
		expect(fromDocument("日", "utf-16le")).toBe("日");
		expect(toDocument("日", "utf-16le", escapeHtmlCodePoint)).toBe("日");
	});
});

describe("HtmlGenerator.getFileUrlForms", () => {
	const HtmlGenerator = require("../../lib/html/HtmlGenerator");

	it("should list the url a page not in UTF-8 writes", () => {
		const forms = HtmlGenerator.getFileUrlForms("café[1] a.js");
		expect(forms).toContain("café[1] a.js");
		expect(forms).toContain("café[1]%20a.js");
		expect(forms).toContain("caf%C3%A9[1]%20a.js");
	});
});
