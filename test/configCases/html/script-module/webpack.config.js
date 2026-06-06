"use strict";

// Classic output (no `experiments.outputModule`), but
// `module.parser.html.scriptModule` opts `<script>` without a `type` into ES module
// semantics: the parser upgrades them to `<script type="module">`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	output: {
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		parser: {
			html: {
				scriptModule: true
			}
		}
	},
	experiments: {
		html: true
	}
};
