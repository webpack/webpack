"use strict";

const sef = require("./sef.cjs");
const part = require("./part.cjs");
const effect = require("./effect.cjs");
const ignored = require(/* webpackIgnore: true */ "path");

exports.whole = sef;
exports.member = sef.y;
Object.defineProperty(exports, "viaValue", { enumerable: true, value: sef });
Object.defineProperty(exports, "viaGetter", { enumerable: true, get: () => sef });

exports.part = part;
exports.partA = part.a;

exports.effect = effect;

exports.ignored = ignored;

exports.used = "used";
