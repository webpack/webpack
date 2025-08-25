"use strict";

const { getSourceMappingURL } = require("../lib/util/extractSourceMap");

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
		'anInvalidDirective = "\\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))))+" */";',
		'// # sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))))+"'
	];

	for (const item of cases) {
		it(`should work with "${item}" url`, async () => {
			const { sourceMappingURL } = getSourceMappingURL(item);

			expect(sourceMappingURL).toMatchSnapshot("result");
		});
	}
});
