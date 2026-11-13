"use strict";

const { webpackConfigOf } = require("../../../helpers/mergedConfigCases");

// Each directory here is one of the HTML minifier's cases.
module.exports = webpackConfigOf(__dirname);
