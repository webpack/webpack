module.exports = function(optimist) {
	optimist

	.boolean("help").alias("help", "h").alias("help", "?").describe("help")

	.string("config").describe("config")

	.string("context").describe("context")

	.string("entry").describe("entry")

	.string("module-bind").describe("module-bind")

	.string("module-bind-post").describe("module-bind-post")

	.string("module-bind-pre").describe("module-bind-pre")

	.string("output-path").describe("output-path")

	.string("output-file").describe("output-file")

	.string("output-chunk-file").describe("output-chunk-file")

	.string("output-named-chunk-file").describe("output-named-chunk-file")

	.string("output-source-map-file").describe("output-source-map-file")

	.string("output-public-path").describe("output-public-path")

	.string("output-jsonp-function").describe("output-jsonp-function")

	.boolean("output-pathinfo").describe("output-pathinfo")

	.string("output-library").describe("output-library")

	.string("output-library-target").describe("output-library-target")

	.string("records-input-path").describe("records-input-path")

	.string("records-output-path").describe("records-output-path")

	.string("records-path").describe("records-path")

	.string("define").describe("define")

	.string("target").describe("target")

	.boolean("cache").describe("cache").default("cache", true)

	.boolean("watch").alias("watch", "w").describe("watch")

	.boolean("hot").alias("hot", "h").describe("hot")

	.boolean("debug").describe("debug")

	.string("devtool").describe("devtool")

	.boolean("progress").describe("progress")

	.string("resolve-alias").describe("resolve-alias")

	.string("resolve-loader-alias").describe("resolve-loader-alias")

	.describe("optimize-max-chunks")

	.describe("optimize-min-chunk-size")

	.boolean("optimize-minimize").describe("optimize-minimize")

	.boolean("optimize-occurence-order").describe("optimize-occurence-order")

	.boolean("optimize-dedupe").describe("optimize-dedupe")

	.string("prefetch").describe("prefetch")

	.string("provide").describe("provide")

	.boolean("labeled-modules").describe("labeled-modules")

	.string("plugin").describe("plugin")

	.boolean("bail").describe("bail")

	.boolean("profile").describe("profile")

	.boolean("d").describe("d", "shortcut for --debug --devtool sourcemap --output-pathinfo")

	.boolean("p").describe("p", "shortcut for --optimize-minimize");
};