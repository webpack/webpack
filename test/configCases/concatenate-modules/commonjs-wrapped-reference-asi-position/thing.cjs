"use strict";

const log = require("./log");

log.push("thing");

exports.named = () => log.push("named");
