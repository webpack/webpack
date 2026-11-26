"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

/** @import { EmbeddedSourceRenderer } from "../../../../lib/html/syntax-parser.js" */
/** @import { Configuration } from "../../../../" */

// Tags each body with the type it arrived as. CSS keeps its shape, a `style=""`
// included — that is CSS too, with `as` saying it is a block's contents.
/** @type {EmbeddedSourceRenderer} */
const renderEmbeddedSource = (source, { type, hostType }) =>
	type === "css"
		? source.replace(/\s+/g, "")
		: `/*${type}-in-${hostType}*/${source.replace(/\s+/g, " ").trim()}`;

/** @type {Configuration} */
module.exports = {
	target: "web",
	experiments: { html: true },
	plugins: [new SampleEmbeddedMinifyPlugin({ renderEmbeddedSource })]
};
