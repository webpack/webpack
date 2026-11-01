"use strict";
// a require() target renders behind the lazy wrapper
exports.readEsm = () => require("./pure-esm").value;
exports.readImporter = () => require("./pure-esm-importer").read();
