"use strict";

const webpack = require("../../../../");

// An HTML asset webpack emits without parsing it: the only shape whose
// `<script>` bodies stay inline, since one it parses has each extracted.
const PAGE = `<!doctype html>
<html lang="en">
	<head><title>inline script</title></head>
	<body>
		<script>
			function sharedFn(a, b) {
				const result = a + b;
				return result;
			}
			window.sharedResult = sharedFn(1, 2);
		</script>
		<script type="text/javascript">
			window.essenceRan = true;
		</script>
		<script type="module">
			const unusedTop = "dropped";
			window.moduleRan = true;
			await Promise.resolve();
		</script>
		<script>
			window.closer = "</scr" + "ipt>";
		</script>
		<script type="text/template">
			{{  each   item  }}
		</script>
		<script type="text/javascript; charset=utf-8">
			var   notAnEssence   =   1 ;
		</script>
		<script></script>
	</body>
</html>
`;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which hands the JS minifier's own
		// options to `htmlMinify` for an inline `<script>` too.
		minimizer: ["..."]
	},
	experiments: {
		html: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("EmitPage", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "EmitPage",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							compilation.emitAsset(
								"page.html",
								new webpack.sources.RawSource(PAGE)
							);
						}
					);
				});
			}
		}
	]
};
