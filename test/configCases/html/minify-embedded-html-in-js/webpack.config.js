"use strict";

const SampleEmbeddedMinifyPlugin = require("../../../helpers/SampleEmbeddedMinifyPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: { html: true },
	plugins: [new SampleEmbeddedMinifyPlugin()]
};
