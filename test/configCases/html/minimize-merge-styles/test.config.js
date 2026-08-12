"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(page).toMatchSnapshot();

		// Adjacent, and adjacent across whitespace: one element, source order kept.
		expect(page).toContain(
			"<style>.merge-a{color:red}.merge-b{color:#00f}</style>"
		);
		expect(page).toContain("<style>.ws-a{color:red}.ws-b{color:#00f}</style>");
		// Three in a row fold into one, not two.
		expect(page).toContain(
			"<style>.three-a{color:red}.three-b{color:#00f}.three-c{color:#0f0}</style>"
		);
		// Matching `media` folds; a differing one would change which sheet applies.
		expect(page).toContain(
			"<style media=screen>.same-a{color:red}.same-b{color:#00f}</style>"
		);
		expect(page).toContain("<style media=screen>.media-a{color:red}</style>");

		// Anything but whitespace between them means the fold would reorder it —
		// a comment counts even where minifying drops the comment itself.
		expect(page).toContain("<style>.link-a{color:red}</style><link");
		expect(page).toContain(
			"<style>.cmt-a{color:red}</style><style>.cmt-b{color:#00f}</style>"
		);
		// A differing `nonce` is a different element to CSP.
		expect(page).toContain("<style nonce=n1>.nonce-a{color:red}</style>");
		// An empty sheet has no text node to fold into the one before it.
		expect(page).toContain("<style>.empty-a{color:red}</style><style></style>");

		// Not CSS, so the bodies are not sheets to join.
		expect(page).toContain(
			"<style type=text/template>.tpl-a{ not css </style><style type=text/template>"
		);
		// Foreign content: an SVG `<style>` is a different element.
		expect(page).toContain(".svg-a{color:red}</style><style>");
	}
};
