"use strict";

const supportsTextDecoder = require("../../../helpers/supportsTextDecoder");

// `with { type: "bytes" }` produces a Uint8Array (asset/bytes), and the
// asset/source assertion uses `TextDecoder` to compare bytes to text.
module.exports = () => supportsTextDecoder();
