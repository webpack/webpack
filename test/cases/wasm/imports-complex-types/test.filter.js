const supports = require("webassembly-feature");

module.exports = () => supports.simd();
