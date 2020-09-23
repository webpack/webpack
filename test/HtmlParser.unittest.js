"use strict";

const HtmlParser = require("../lib/html/HtmlParser");

const options = {
	decodeEntities: false,
	lowerCaseTags: false,
	lowerCaseAttributeNames: false,
	recognizeCDATA: true,
	recognizeSelfClosing: true
};

describe("correct attributes range", () => {
	it("with quotes", () => {
		let range;
		const testParser = new HtmlParser(options);
		testParser.hooks.tag.for("img").tap("Test", element => {
			range = element.attribs.src.range;
		});
		const pre = "<img src=";
		const post = "/>";
		const code = `${pre}"http://ok.ok"${post}`;
		testParser.parse(code, {});
		expect(range).toEqual([pre.length, code.length - post.length - 1]);
	});

	it("without quotes", () => {
		let range;
		const testParser = new HtmlParser(options);
		testParser.hooks.tag.for("img").tap("Test", element => {
			range = element.attribs.src.range;
		});
		const pre = "<img src=";
		const post = "/>";
		const code = `${pre}nosrc ${post}`;
		testParser.parse(code, {});
		expect(range).toEqual([pre.length, code.length - post.length - 1]);
	});
});
