"use strict";
var leaf = require("./kept-leaf");
var cache = require.cache;
exports.read = () => leaf.a + cache;
