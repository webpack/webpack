module.exports = function(optimist) {
	optimist

	// Alphabetized order

	.boolean("bail").describe("bail")

	.boolean("cache").describe("cache").default("cache", true)

	.boolean("colors").alias("colors", "c").describe("colors")

	.string("config").describe("config")

	.string("context").describe("context")

	.boolean("debug").describe("debug")

	.string("define").describe("define")

	.string("devtool").describe("devtool")

	.boolean("display-cached").describe("display-cached")
	.boolean("display-cached-assets").describe("display-cached-assets")
	.boolean("display-chunks").describe("display-chunks")
	.boolean("display-error-details").describe("display-error-details")

	.string("display-exclude").describe("display-exclude")
	.boolean("display-modules").describe("display-modules")
	.boolean("display-origins").describe("display-origins")
	.boolean("display-reasons").alias("display-reasons", "verbose").alias("display-reasons", "v").describe("display-reasons")

	.string("entry").describe("entry")

	.boolean("help").alias("help", "h").alias("help", "?").describe("help")

	.boolean("hide-modules").describe("hide-modules")

	.boolean("hot").alias("hot", "h").describe("hot")

	.boolean("json").alias("json", "j").describe("json")

	.boolean("labeled-modules").describe("labeled-modules")

	.string("module-bind").describe("module-bind")
	.string("module-bind-post").describe("module-bind-post")
	.string("module-bind-pre").describe("module-bind-pre")

	.boolean("optimize-dedupe").describe("optimize-dedupe")

	.describe("optimize-max-chunks")
	.describe("optimize-min-chunk-size")
	.boolean("optimize-minimize").describe("optimize-minimize")
	.boolean("optimize-occurence-order").describe("optimize-occurence-order")

	.string("output-chunk-file").describe("output-chunk-file")
	.string("output-file").describe("output-file")
	.string("output-jsonp-function").describe("output-jsonp-function")
	.string("output-library").describe("output-library")
	.string("output-library-target").describe("output-library-target")
	.string("output-named-chunk-file").describe("output-named-chunk-file")
	.string("output-path").describe("output-path")
	.boolean("output-pathinfo").describe("output-pathinfo")
	.string("output-public-path").describe("output-public-path")
	.string("output-source-map-file").describe("output-source-map-file")

	.string("plugin").describe("plugin")

	.string("prefetch").describe("prefetch")

	.boolean("profile").describe("profile")

	.boolean("progress").describe("progress")

	.string("provide").describe("provide")

	.string("records-input-path").describe("records-input-path")
	.string("records-output-path").describe("records-output-path")
	.string("records-path").describe("records-path")
	.string("resolve-alias").describe("resolve-alias")
	.string("resolve-loader-alias").describe("resolve-loader-alias")

	.boolean("silent").alias("silent", "s").describe("silent")

	.string("sort-assets-by").describe("sort-assets-by")
	.string("sort-chunks-by").describe("sort-chunks-by")

	.string("sort-modules-by").describe("sort-modules-by")

	.string("target").describe("target")

	.boolean("watch").alias("watch", "w").describe("watch")

	.boolean("quiet").alias("quiet", "q").describe("quiet")

	.boolean("d").describe("d", "shortcut for --debug --devtool sourcemap --output-pathinfo")

	.boolean("p").describe("p", "shortcut for --optimize-minimize");
	
};