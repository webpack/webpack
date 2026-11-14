"use strict";

const { webpackConfigOf } = require("../../../helpers/mergedConfigCases");

// Each directory here is one of the JavaScript minifier's cases.
module.exports = webpackConfigOf(__dirname);
