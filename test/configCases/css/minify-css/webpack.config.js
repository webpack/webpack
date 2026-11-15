"use strict";

const { webpackConfigOf } = require("../../../helpers/mergedConfigCases");

// Each directory here is one of the CSS minifier's cases.
module.exports = webpackConfigOf(__dirname);
