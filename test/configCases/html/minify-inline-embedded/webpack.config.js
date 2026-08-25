"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

// Tags each body with the type it arrived as. CSS keeps its shape: a `style=""`
// arrives wrapped in a throwaway rule the serializer only unwraps if it stays one.
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
