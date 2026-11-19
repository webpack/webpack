"use strict";

// a plain named import of JSON warns as it does everywhere, once per build
const warning = [/Should not import the named export 'a'/];

module.exports = [warning, warning, warning];
