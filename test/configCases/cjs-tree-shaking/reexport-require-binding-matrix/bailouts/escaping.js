"use strict";

const ns = require("../targets/cjs?escaping");
exports.ns = ns;
// the binding escapes as a whole here, so nothing may be shaken
exports.keys = Object.keys(ns).sort();
