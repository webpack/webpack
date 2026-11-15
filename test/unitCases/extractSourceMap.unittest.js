"use strict";

const { getSourceMappingURL } = require("../../lib/module/extractSourceMap");

describe("getSourceMappingURL", () => {
	const cases = [
		"/*#sourceMappingURL=absolute-sourceRoot-source-map.map*/",
		"/*  #sourceMappingURL=absolute-sourceRoot-source-map.map  */",
		"//#sourceMappingURL=absolute-sourceRoot-source-map.map",
		"//@sourceMappingURL=absolute-sourceRoot-source-map.map",
		" //  #sourceMappingURL=absolute-sourceRoot-source-map.map",
		" //  #  sourceMappingURL  =   absolute-sourceRoot-source-map.map  ",
		"// #sourceMappingURL = http://hello.com/external-source-map2.map",
		"// #sourceMappingURL = //hello.com/external-source-map2.map",
		"// @sourceMappingURL=data:application/source-map;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLXNvdXJjZS1tYXAuanMiLCJzb3VyY2VzIjpbImlubGluZS1zb3VyY2UtbWFwLnR4dCJdLCJzb3VyY2VzQ29udGVudCI6WyJ3aXRoIFNvdXJjZU1hcCJdLCJtYXBwaW5ncyI6IkFBQUEifQ==",
		`
        with SourceMap
    
        // #sourceMappingURL = /sample-source-map.map
        // comment
        `,
		`
        with SourceMap
        // #sourceMappingURL = /sample-source-map-1.map
        // #sourceMappingURL = /sample-source-map-2.map
        // #sourceMappingURL = /sample-source-map-last.map
        // comment
        `,
		`"
        /*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))))+" */";`,
		'anInvalidDirective = "\\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))))+" */";'
	];

	for (const item of cases) {
		it(`should work with "${item}" url`, async () => {
			const { sourceMappingURL } = getSourceMappingURL(item);

			expect(sourceMappingURL).toMatchSnapshot("result");
		});
	}

	it.each([
		"",
		" \n\t ",
		"// ordinary comment",
		"//# sourceMappingURL=",
		"//# sourceMappingURL=missing.map\nrun();",
		"//# sourceMappingURL=missing.map\n// `",
		"//# sourceMappingURL=missing.map\n// 'quoted'",
		"//# sourceMappingURL=missing.map\n// */",
		"//# sourceMappingURL=missing.map\n// ordinary /* trailing */",
		'// # sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))))+"',
		"/*# sourceMappingURL=missing.map*/ /x*/",
		"/x*/",
		'/*# sourceMappingURL=missing.map*/ /* " */',
		"/* ordinary /*# sourceMappingURL=missing.map*/",
		"module.exports = `\n//# sourceMappingURL=missing.map\n/* ordinary\n`; const tail = /.*/"
	])("should ignore missing or ambiguous trailing annotations in %j", code => {
		expect(getSourceMappingURL(code).sourceMappingURL).toBe("");
	});

	it.each(["\n", "\r\n", "\r", "\u2028", "\u2029"])(
		"should recognize trailing comment lines separated by %j",
		separator => {
			const code = [
				"run();",
				"\uFEFF //# sourceMappingURL=source%20map.map",
				"// ordinary trailing comment",
				"\uFEFF "
			].join(separator);
			expect(getSourceMappingURL(code).sourceMappingURL).toBe("source map.map");
		}
	);

	it("should identify the final comment range instead of identical earlier text", () => {
		const comment = "/*# sourceMappingURL=source.map */";
		const prefix = `const value = "${comment}";\n`;
		expect(getSourceMappingURL(`${prefix}${comment}\n`)).toEqual({
			sourceMappingURL: "source.map",
			replacementString: comment,
			replacementStart: prefix.length
		});
	});

	it("should accept a multiline block followed by an ordinary block", () => {
		expect(
			getSourceMappingURL(
				"run(); /*\n//# sourceMappingURL=source.map\n*/ /* ordinary */"
			).sourceMappingURL
		).toBe("source.map");
	});

	it.each([
		["/*# sourceMappingURL=a.map*/", "a.map", "/*# sourceMappingURL=a.map*/"],
		[
			"/*  # sourceMappingURL  =  a.map  */  ",
			"a.map",
			"/*  # sourceMappingURL  =  a.map  */"
		],
		["/*# sourceMappingURL=a*b.map*/", "a*b.map", "/*# sourceMappingURL=a*b.map*/"],
		["/*# sourceMappingURL=a.map/ */", "a.map/", "/*# sourceMappingURL=a.map/ */"],
		["/*\n//# sourceMappingURL=a.map\n*/", "a.map", "/*\n//# sourceMappingURL=a.map\n*/"],
		[
			"/*\r\n//  @sourceMappingURL=a.map\r\n*/",
			"a.map",
			"/*\r\n//  @sourceMappingURL=a.map\r\n*/"
		],
		["/*\n  //# sourceMappingURL=a.map */", "", ""],
		["/*# sourceMappingURL=  */", "", "/*# sourceMappingURL=  */"],
		["/*# sourceMappingURL=a b */", "", ""],
		["//# sourceMappingURL=a.map  ", "a.map", "//# sourceMappingURL=a.map"],
		["//# sourceMappingURL=   ", "", "//# sourceMappingURL="],
		["//# sourceMappingURL=a b", "", ""]
	])("should read %j as %j replacing %j", (code, url, replacement) => {
		expect(getSourceMappingURL(code)).toEqual({
			sourceMappingURL: url,
			replacementString: replacement,
			replacementStart: 0
		});
	});

	it.each([
		["block", `/*# sourceMappingURL=${" ".repeat(20000)}a b */`],
		["block with url", `/*# sourceMappingURL=${" ".repeat(20000)}a.map */`],
		["line", `//# sourceMappingURL=${" ".repeat(20000)}a b`],
		["line breaks", `/*${"\n".repeat(20000)}a */`],
		["line breaks and slashes", `/*${"\n//".repeat(20000)}a */`]
	])("should scan long whitespace runs in a %s comment quickly", (_, code) => {
		const start = process.hrtime();
		const { sourceMappingURL } = getSourceMappingURL(code);
		const [seconds] = process.hrtime(start);
		expect(sourceMappingURL).toBe(code.includes("a.map") ? "a.map" : "");
		expect(seconds).toBe(0);
	});

	it.each(["\n", "\r\n", "\r", "\u2028", "\u2029"])(
		"should handle consecutive block comments across %j line boundaries",
		separator => {
			const code = [
				"run(); /*# sourceMappingURL=source.map */ /* first */ /* second */",
				" /* third */ /* fourth */"
			].join(separator);
			expect(getSourceMappingURL(code).sourceMappingURL).toBe("source.map");
		}
	);
});
