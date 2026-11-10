"use strict";

// this require() is what wraps "nested-outer", which in turn wraps its own
// import "nested-inner"
const outer = require("./nested-outer");

global.__nestedOrder = (global.__nestedOrder || []).concat("nested-consumer");

exports.label = outer.label;
