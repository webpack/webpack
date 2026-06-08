"use strict";

const path = require("path");
const fs = require("graceful-fs");
const webpack = require("..");

const outDir = path.join(__dirname, "js", "OutputHtmlPlugin");

/**
 * @param {import("..").Configuration} config webpack configuration
 * @returns {Promise<void>}
 */
function compile(config) {
	return new Promise((resolve, reject) => {
		webpack(
			{
				mode: "production",
				context: path.resolve(__dirname, "fixtures"),
				output: { path: outDir },
				...config
			},
			(err, stats) => {
				if (err) return reject(err);
				if (stats.hasErrors()) {
					return reject(new Error(stats.toString({ errors: true })));
				}
				resolve();
			}
		);
	});
}

describe("OutputHtmlPlugin", () => {
	beforeEach(() => {
		fs.rmSync(outDir, { recursive: true, force: true });
		fs.mkdirSync(outDir, { recursive: true });
	});

	it("emits nothing when output.html is false (default)", async () => {
		await compile({ entry: "./a.js", output: { path: outDir } });
		const files = fs.readdirSync(outDir);
		expect(files.some((f) => f.endsWith(".html"))).toBe(false);
	});

	it("generates an HTML file using the entrypoint name", async () => {
		await compile({
			entry: { page: "./a.js" },
			output: { path: outDir, html: true }
		});
		const html = fs.readFileSync(path.join(outDir, "page.html"), "utf8");
		expect(html).toContain("<title>page</title>");
		expect(html).toContain('<script defer src="page.js"></script>');
		expect(html).not.toContain("<link");
	});

	it("prefixes injected URLs with static publicPath", async () => {
		await compile({
			entry: { page: "./a.js" },
			output: { path: outDir, html: true, publicPath: "/cdn/" }
		});
		const html = fs.readFileSync(path.join(outDir, "page.html"), "utf8");
		expect(html).toContain('src="/cdn/page.js"');
	});

	it("emits type=module scripts for ESM output", async () => {
		await compile({
			entry: { page: "./a.js" },
			experiments: { outputModule: true },
			output: { path: outDir, html: true }
		});
		const html = fs.readFileSync(path.join(outDir, "page.html"), "utf8");
		expect(html).toContain('type="module"');
		expect(html).not.toContain("defer");
	});

	it("escapes special characters in entrypoint name used as title", async () => {
		await compile({
			entry: { main: "./a.js" },
			output: { path: outDir, html: true },
			plugins: [
				{
					apply(compiler) {
						compiler.hooks.thisCompilation.tap("Test", (compilation) => {
							compilation.hooks.processAssets.tap(
								{
									name: "Test",
									stage:
										compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
								},
								() => {
									for (const [, ep] of compilation.entrypoints) {
										ep.name = "<b>xss</b>";
									}
								}
							);
						});
					}
				}
			]
		});
		const html = fs.readFileSync(path.join(outDir, "main.html"), "utf8");
		expect(html).not.toContain("<b>xss</b>");
	});

	it("skips HTML entries and does not emit a duplicate HTML file", async () => {
		const htmlFixture = path.resolve(__dirname, "fixtures/page.html");
		await compile({
			entry: htmlFixture,
			experiments: { html: true },
			output: { path: outDir, html: true }
		});
		const htmlFiles = fs.readdirSync(outDir).filter((f) => f.endsWith(".html"));
		expect(htmlFiles).toHaveLength(1);
		expect(htmlFiles[0]).toMatch(/page/);
	});
});
