"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const launchBrowser = require("../../helpers/launchBrowser");

const FIXTURE = path.resolve(
	__dirname,
	"../../fixtures/html/html-foreign-scripts-run-in-authored-order/index.html"
);
const OUTPUT = path.resolve(__dirname, "../../js/unit/html-foreign-scripts");

/**
 * @param {boolean} outputModule whether the build emits ES modules
 * @returns {Promise<string>} the directory the page is emitted to
 */
const build = (outputModule) => {
	const webpack = require("../../..");

	const outputPath = path.join(OUTPUT, outputModule ? "module" : "classic");
	return new Promise((resolve, reject) => {
		webpack(
			{
				context: path.dirname(FIXTURE),
				entry: { index: FIXTURE },
				mode: "development",
				devtool: false,
				target: "web",
				output: { path: outputPath, module: outputModule },
				experiments: { html: true }
			},
			(err, stats) => {
				if (err) return reject(err);
				const result = /** @type {import("../../..").Stats} */ (stats);
				if (result.hasErrors()) {
					return reject(new Error(result.toString("errors-only")));
				}
				resolve(outputPath);
			}
		);
	});
};

/**
 * @param {string} root the directory to serve
 * @returns {Promise<http.Server>} a server for it on a free port
 */
const serve = (root) =>
	new Promise((resolve) => {
		const server = http.createServer((req, res) => {
			const file = path.join(root, decodeURIComponent(String(req.url)));
			fs.readFile(file, (err, data) => {
				if (err) {
					res.statusCode = 404;
					return res.end();
				}
				res.setHeader(
					"Content-Type",
					/\.m?js$/.test(file) ? "text/javascript" : "text/html"
				);
				res.end(data);
			});
		});
		server.listen(0, "127.0.0.1", () => resolve(server));
	});

describe("HTML foreign scripts", () => {
	/** @type {import("playwright-core").Browser} */
	let browser;

	beforeAll(async () => {
		browser = await launchBrowser();
	}, 120000);

	afterAll(() => browser && browser.close());

	it.each([false, true])(
		"run an SVG script holding markup in the authored order (module output: %s)",
		async (outputModule) => {
			const server = await serve(await build(outputModule));
			try {
				const { port } = /** @type {import("net").AddressInfo} */ (
					server.address()
				);
				const page = await browser.newPage();
				await page.goto(`http://127.0.0.1:${port}/index.html`);
				await page.waitForFunction(
					() =>
						/** @type {EXPECTED_ANY} */ (window).order &&
						/** @type {EXPECTED_ANY} */ (window).order.includes("last")
				);
				expect(
					await page.evaluate(() => /** @type {EXPECTED_ANY} */ (window).order)
				).toEqual(["page", "comment", "element", "plain", "last"]);
				// the element in the script's body stays in the document
				expect(
					await page.evaluate(
						() => document.querySelector("svg #kept") !== null
					)
				).toBe(true);
			} finally {
				server.close();
			}
		},
		120000
	);
});
