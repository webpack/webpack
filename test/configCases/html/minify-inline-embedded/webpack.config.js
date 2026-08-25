"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

// Stands in for a real minifier, tagging each body with the type it arrived as.
// The fixture has no inline `<style>` / `<script>`: the HTML parser lifts those
// into modules of their own, so only what stays in the document reaches this.
// CSS keeps its shape — a `style=""` arrives wrapped in a throwaway rule, and
// the serializer only unwraps what still is one.
/** @type {import("../../../../lib/html/syntax").EmbeddedSourceRenderer} */
const renderEmbeddedSource = (source, { type, hostType }) =>
	type === "css"
		? source.replace(/\s+/g, "")
		: `/*${type}-in-${hostType}*/${source.replace(/\s+/g, " ").trim()}`;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: { html: true },
	plugins: [new SampleEmbeddedMinifyPlugin({ renderEmbeddedSource })]
};
