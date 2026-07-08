"use strict";

// No `experiments.css` and no loader for `.css` → the "auto" default enables the
// built-in CSS module type, so importing raw CSS compiles and exports an object.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development"
};
