"use strict";

const data = require("./data.json");
const dataA = require("./data.json").a;
const svgSource = require("./source.svg");
const jpgInline = require("./inline.jpg");
const pngUrl = require("./resource.png");

// local binding form
exports.keys = Object.keys(data).join(",");
exports.dataA = dataA;
exports.dataEsModuleFlag = data.__esModule;
exports.svgSource = svgSource;
exports.jpgInline = jpgInline;
exports.pngUrl = pngUrl;

// direct form
exports.dataDirect = require("./data.json");
exports.dataEsModuleFlagDirect = require("./data.json").__esModule;
exports.svgSourceDirect = require("./source.svg");
exports.jpgInlineDirect = require("./inline.jpg");
exports.pngUrlDirect = require("./resource.png");
