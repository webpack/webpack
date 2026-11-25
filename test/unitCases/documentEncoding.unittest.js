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
	scriptToDocument,
	toDocument
} = require("../../lib/html/documentEncoding");
const vm = require("vm");

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

const supportsPrivateFields = (() => {
	try {
		// eslint-disable-next-line no-new-func
		new Function("class A { #a = 1; }");
		return true;
	} catch (_err) {
		return false;
	}
})();

describeIf("scriptToDocument", () => {
	/**
	 * @param {string} code a script
	 * @returns {unknown} what it leaves in `result`
	 */
	const run = (code) => {
		/** @type {{ result?: unknown }} */
		const context = {};
		vm.runInNewContext(code, context);
		return context.result;
	};

	it("should leave a script the encoding holds as toDocument writes it", () => {
		const code = "result = String.raw`€`;";
		expect(scriptToDocument(code, "windows-1252")).toBe(
			toDocument(code, "windows-1252", escapeJsCodePoint)
		);
		expect(scriptToDocument(code, "utf-16le")).toBe(code);
		expect(scriptToDocument("result = 1;", "windows-1252")).toBe("result = 1;");
	});

	it("should declare its names after the directives", () => {
		const code =
			'"use strict"\nthis.result = [String.raw`★`, (function () { return this; })()];';
		const written = scriptToDocument(code, "windows-1252");
		expect(written).toMatch(
			/^"use strict";var __webpack_template_\w+_0__, __webpack_template_\w+_object__ = \(\{\}\)\.constructor;/
		);
		expect(run(written)).toEqual(["★", undefined]);
	});

	it("should keep a cooked string an invalid escape has none of", () => {
		const code =
			"const tag = (s) => [s[0], s.raw[0]];\nresult = tag`\\unicode★`;";
		expect(run(scriptToDocument(code, "windows-1252"))).toEqual([
			undefined,
			"\\unicode★"
		]);
	});

	it("should escape an astral character of a private name", () => {
		const code =
			"class A { #𝑥 = 1; get() { return this.#𝑥; } }\nresult = new A().get();";
		const written = scriptToDocument(code, "windows-1252");
		expect(written).toContain("#\\u{1d465}");
		// private names run from Node.js 12
		if (supportsPrivateFields) expect(run(written)).toBe(1);
	});

	it("should not read a binding the script names `Object`", () => {
		const code = "const Object = null;\nthis.result = String.raw`★`;";
		expect(run(scriptToDocument(code, "windows-1252"))).toBe("★");
	});

	it("should keep a `#!` line first", () => {
		const code = "#!/usr/bin/env node\nthis.result = String.raw`★`;";
		const written = scriptToDocument(code, "windows-1252");
		expect(written).toMatch(/^#!\/usr\/bin\/env node\nvar __webpack_template_/);
		expect(run(written.replace(/^#!.*\n/, ""))).toBe("★");
	});

	it("should keep a line separator that ends a line as a line break", () => {
		for (const separator of ["\u2028", "\u2029"]) {
			const code = `#!/usr/bin/env node${separator}// a comment${separator}this.result = [String.raw\`★\`, "a${separator}b"];`;
			const written = scriptToDocument(code, "windows-1252");
			expect(written).toMatch(/^#!\/usr\/bin\/env node\nvar /);
			expect(written).toContain("// a comment\nthis.result");
			expect(run(written.replace(/^#!.*\n/, ""))).toEqual([
				"★",
				`a${separator}b`
			]);
		}
		for (const terminator of ["\n", "\r\n"]) {
			const code = `#!/usr/bin/env node${terminator}this.result = String.raw\`★\`;`;
			expect(scriptToDocument(code, "windows-1252")).toMatch(
				new RegExp(`^#!/usr/bin/env node${terminator}var `)
			);
		}
	});

	it("should read a module", () => {
		const code = "export const value = String.raw`★`;";
		expect(scriptToDocument(code, "windows-1252")).toMatch(
			/^var __webpack_template_\w+_0__, __webpack_template_\w+_object__ = \(\{\}\)\.constructor;export const value = \(\(String\.raw\)/
		);
	});

	it("should escape a script it cannot parse as toDocument does", () => {
		const code = "result = String.raw`★` +;";
		expect(scriptToDocument(code, "windows-1252")).toBe(
			toDocument(code, "windows-1252", escapeJsCodePoint)
		);
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
