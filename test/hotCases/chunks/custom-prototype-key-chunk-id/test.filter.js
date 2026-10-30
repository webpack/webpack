"use strict";

// The require, importScripts and readFile chunk loaders key installed chunks by id
// without an own-key check, so only JSONP loads such chunks.
module.exports = (config) => config.target === "web";
