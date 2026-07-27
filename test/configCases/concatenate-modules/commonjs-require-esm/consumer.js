"use strict";

const ns = require("./plain-esm.js");
const nsFoo = require("./plain-esm.js").foo;
const unwrapped = require("./value-esm.js");
const unwrappedNamed = require("./value-esm.js").named;
const sharedNs = require("./shared-esm.js");
const { bump } = require("./shared-esm.js");
const chain = require("./chain-a.js");

exports.ns = ns;
exports.nsFoo = nsFoo;
exports.unwrapped = unwrapped;
exports.unwrappedNamed = unwrappedNamed;
exports.sharedNs = sharedNs;
exports.bumpFromCjs = bump;
exports.chain = chain;
