"use strict";

const fs = require("fs");
const path = require("path");

const { fixture } = require("../../helpers/fixture");

const webpack = require("../../../");

const { xmlMinify } = webpack.html;
const { SourceProcessor } = webpack.html.syntax;

const FIXTURES = path.join(__dirname, "../../fixtures/xml");

// svgo's expected outputs are pretty-printed; this drops only that whitespace.
const COMPACT = /** @type {const} */ ({
	xml: true,
	mode: "minify",
	collapseWhitespace: true
});

describe("xmlMinify against svgo's plugin tests", () => {
	it("should write no more than svgo where svgo keeps the rendering", async () => {
		const rows = [];
		let webpackTotal = 0;
		let svgoTotal = 0;
		for (const name of fs.readdirSync(FIXTURES).sort()) {
			if (!name.startsWith("svgo-")) continue;
			const dir = path.join(FIXTURES, name);
			const [{ print, minimizer, ...options }] = JSON.parse(
				fs.readFileSync(path.join(dir, "options.json"), "utf8")
			);
			const ours = (
				await xmlMinify(
					{ "index.svg": fixture("xml", name) },
					undefined,
					options
				)
			).code.length;
			const theirs = new SourceProcessor().process(
				fs.readFileSync(path.join(dir, "svgo.xml"), "utf8"),
				COMPACT
			).code.length;
			webpackTotal += ours;
			svgoTotal += theirs;
			rows.push(
				`${name}: webpack ${ours}, svgo ${theirs}, gap ${ours - theirs}`
			);
		}
		rows.push(`total: webpack ${webpackTotal}, svgo ${svgoTotal}`);
		expect(rows.join("\n")).toMatchSnapshot();
	});
});
