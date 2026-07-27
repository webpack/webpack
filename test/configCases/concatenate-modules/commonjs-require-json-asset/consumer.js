"use strict";

// bound to locals first: `exports.x = require(...)` would be a
// CommonJsExportRequireDependency and bail the whole module out
const data = require("./data.json");
const dataA = require("./data.json").a;
const svgSource = require("./source.svg");
const jpgInline = require("./inline.jpg");
const pngUrl = require("./resource.png");

exports.keys = Object.keys(data).join(",");
exports.dataA = dataA;
exports.dataEsModuleFlag = data.__esModule;
exports.svgSource = svgSource;
exports.jpgInline = jpgInline;
exports.pngUrl = pngUrl;
