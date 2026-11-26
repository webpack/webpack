"use strict";

/** @import { Configuration } from "../../../../" */

// No `experiments.css` and no loader for `.css` → the "auto" default enables the
// built-in CSS module type, so importing raw CSS compiles and exports an object.
/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development"
};
