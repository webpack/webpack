"use strict";

const {
	RESPELLINGS,
	attributeSites,
	oneLine,
	respell,
	sweepDocument,
	tokenStream
} = require("../tooling/check-html-invariants");

// One attribute per value shape the respellings have to decide about: a
// delimiter inside the value, a reference, a space, `>`, and an astral character.
const SHAPES =
	'<input a="1" b=\'q"t\' c=bare d e="a&amp;b" f="a>b" g="x y" h="&#x1f600;">';

describe("check-html-invariants", () => {
	describe("attributeSites", () => {
		it("reports every attribute with the tag holding it", () => {
			const sites = attributeSites('<p id=a class="b c">t</p>');
			expect(sites.map((site) => [site.name, site.value])).toEqual([
				["id", "a"],
				["class", "b c"]
			]);
			expect(sites.map((site) => [site.tagStart, site.tagEnd])).toEqual([
				[0, 20],
				[0, 20]
			]);
		});

		it("reads a valueless attribute as an empty value", () => {
			expect(attributeSites("<input checked>")[0]).toMatchObject({
				name: "checked",
				value: ""
			});
		});

		it("leaves a close tag's attributes alone, as the tree builder does", () => {
			expect(attributeSites("<p>t</p id=a>")).toEqual([]);
		});

		it("decodes a value through its references", () => {
			expect(
				attributeSites('<a t="a&amp;b&#x3c;c">').map((s) => s.value)
			).toEqual(["a&b<c"]);
		});
	});

	describe("tokenStream", () => {
		it("reads three spellings of one attribute identically", () => {
			const quoted = tokenStream('<form method="get">');
			expect(tokenStream("<form method=get>")).toBe(quoted);
			expect(tokenStream('<form method="&#x67;et">')).toBe(quoted);
			expect(tokenStream("<FORM METHOD='get'>")).toBe(quoted);
		});

		it("reads a whole document, not only its tags", () => {
			const stream = tokenStream("<!DOCTYPE html><p>text<!--note--></p><br>");
			expect(stream).toContain("doctype html");
			expect(stream).toContain("<!--note");
			expect(stream).toContain("</p");
			expect(stream).toContain("text");
		});

		it("separates two documents that say different things", () => {
			expect(tokenStream("<form method=get>")).not.toBe(
				tokenStream("<form method=post>")
			);
			expect(tokenStream("<input checked>")).not.toBe(
				tokenStream("<input checked=checked>")
			);
		});
	});

	describe("respell", () => {
		for (const respelling of RESPELLINGS) {
			it(`keeps what the document says through ${respelling.name}`, () => {
				const respelled = respell(SHAPES, attributeSites(SHAPES), respelling);
				expect(respelled).not.toBe(SHAPES);
				expect(tokenStream(respelled)).toBe(tokenStream(SHAPES));
			});
		}

		it("declines a value no delimiter can hold", () => {
			const respelling =
				/** @type {import("../tooling/check-html-invariants").Respelling} */ (
					RESPELLINGS.find((one) => one.name === "unquote")
				);
			const respelled = respell(SHAPES, attributeSites(SHAPES), respelling);
			expect(respelled).toContain('g="x y"');
			expect(respelled).toContain('f="a>b"');
			expect(respelled).toContain("c=bare");
		});
	});

	describe("oneLine", () => {
		// Built rather than written: a control character in this file makes git
		// read it as binary and stop showing its diff.
		const control = (/** @type {number} */ code) => String.fromCharCode(code);

		it("shows a control character the whitespace collapse would hide", () => {
			expect(oneLine(`a${control(0x0b)}b`, 40)).toBe("a\\x0bb");
			expect(oneLine(`a${control(0)}b`, 40)).toBe("a\\x00b");
		});

		it("collapses the whitespace a tag is written with", () => {
			expect(oneLine("<p\n\tid=a\t>", 40)).toBe("<p id=a >");
		});

		it("cuts what is past the limit", () => {
			expect(oneLine("abcdef", 4)).toBe("abc…");
		});
	});

	describe("sweepDocument", () => {
		it("reports nothing about a printer that is stable and spelling-blind", () => {
			// Canonicalizing, so every spelling of the tag reaches one output. An
			// identity printer is not it: echoing a respelling is depending on it.
			const minify = (/** @type {string} */ html) =>
				html.replace(/^<(\w+)[\S\s]*>$/, "<$1>");
			expect(sweepDocument(minify, SHAPES)).toEqual([]);
		});

		it("reports a printer whose second pass moves", () => {
			// One space per pass, so no pass is ever the last.
			const minify = (/** @type {string} */ html) => html.replace(" ", "");
			const reports = sweepDocument(minify, SHAPES);
			expect(reports.map((one) => one.relation)).toContain("idempotence");
		});

		it("reports a printer that folds one spelling and not another", () => {
			// Reaches the quoted spelling only, which is the shape of the defect
			// this sweep exists for.
			const minify = (/** @type {string} */ html) =>
				html.replace(/[=]"GET"/g, '="get"');
			const reports = sweepDocument(minify, '<form method="GET">');
			expect(reports.map((one) => one.relation)).toContain(
				"respelling unquote"
			);
		});

		it("reports a printer that throws on the document itself", () => {
			const minify = () => {
				throw new Error("nope");
			};
			expect(sweepDocument(minify, SHAPES)).toEqual([
				{ relation: "minify", what: "threw", repro: "    nope" }
			]);
		});

		it("reports a second pass that only appends", () => {
			// No character of the first output differs, so the difference is found
			// past the end of it rather than inside a tag.
			const minify = (/** @type {string} */ html) => `${html}!`;
			const reports = sweepDocument(minify, "<p>t");
			expect(reports.map((one) => one.relation)).toContain("idempotence");
		});

		it("keeps the attributes a finding needs together", () => {
			// Neither attribute carries it alone, so the bisection stops with both.
			const minify = (/** @type {string} */ html) =>
				html === '<input a="1" b="2">' ? "<input>" : html;
			const reports = sweepDocument(minify, "<input a=1 b=2>");
			expect(reports).toContainEqual(
				expect.objectContaining({ relation: "respelling quote-double" })
			);
			expect(reports[0].repro).toContain('<input a="1" b="2">');
		});

		it("says so where only the page reproduces a finding", () => {
			// Throwing on the tag alone is a printer the repro cannot be cut for.
			const minify = (/** @type {string} */ html) => {
				if (html.startsWith("<a")) throw new Error("nope");
				return html.replace('t="x"', "t=x");
			};
			const reports = sweepDocument(minify, '<p><a t="x">');
			expect(reports[0].repro).toContain("(only in the page)");
		});

		it("reports a printer that throws on a respelling", () => {
			const minify = (/** @type {string} */ html) => {
				if (html.includes("&#x")) throw new Error("nope");
				return html;
			};
			const reports = sweepDocument(minify, '<a t="ab">');
			expect(reports).toContainEqual(
				expect.objectContaining({
					relation: "respelling references",
					what: "threw: nope"
				})
			);
		});
	});

	describe("main", () => {
		it("writes one block per finding over the corpus the filters name", () => {
			// The filters are read as the module loads, so they are set before it is
			// loaded again — one fixture and one relation keep the run to a moment.
			const before = {
				fixture: process.env.FIXTURE,
				preset: process.env.PRESET,
				relation: process.env.RELATION
			};
			process.env.FIXTURE = "html/minimize-attributes/page.html";
			process.env.PRESET = "default";
			process.env.RELATION = "idempotence";
			/** @type {string[]} */
			const written = [];
			let found = 0;
			try {
				jest.resetModules();
				found = require("../tooling/check-html-invariants").main((text) => {
					written.push(text);
				});
			} finally {
				process.env.FIXTURE = before.fixture;
				process.env.PRESET = before.preset;
				process.env.RELATION = before.relation;
				jest.resetModules();
			}
			expect(found).toBe(written.length);
			for (const block of written) {
				expect(block).toMatch(/^\n\S[^\n]* — [^\n]*\n/);
				expect(block).toContain("[default] ");
			}
		});
	});
});
