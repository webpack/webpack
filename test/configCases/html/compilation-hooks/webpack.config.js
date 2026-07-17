"use strict";

// Emulates real plugin usage of the HTML compilation hooks, reached through the
// public `webpack.html.HtmlModulesPlugin` export:
//  - two `beforeEmit` taps prove the waterfall (the 2nd sees the 1st's output),
//  - `beforeEmit` injects a CSP `<meta>` (a common real transform),
//  - `afterEmit` records each finalized page (a manifest-style side effect).
/** @type {import("../../../../").WebpackPluginInstance} */
const hooksPlugin = {
	apply(compiler) {
		const { RawSource } = compiler.webpack.sources;
		const { HtmlModulesPlugin } = compiler.webpack.html;
		compiler.hooks.thisCompilation.tap("HooksPlugin", (compilation) => {
			const hooks = HtmlModulesPlugin.getCompilationHooks(compilation);
			// Waterfall tap 1: inject a CSP meta into <head>.
			hooks.beforeEmit.tapPromise("csp", async (html) =>
				html.replace(
					"</head>",
					'<meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head>'
				)
			);
			// Waterfall tap 2: runs after tap 1 and sees its injected CSP.
			hooks.beforeEmit.tapPromise("marker", async (html, { outputName }) => {
				const sawCsp = html.includes("Content-Security-Policy");
				return html.replace(
					"</body>",
					`<!-- csp:${sawCsp} name:${outputName} --></body>`
				);
			});
			// afterEmit: a post-emit notification — record the finalized page.
			hooks.afterEmit.tapPromise("manifest", async ({ outputName }) => {
				compilation.emitAsset("pages.txt", new RawSource(outputName));
			});
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	plugins: [hooksPlugin],
	experiments: {
		html: true
	}
};
