"use strict";

// `q?r:s` is named so on purpose, to check the `_` its filename gets
const warning = [/Chunk name "q\?r:s" contains '\?' or '#'/];

module.exports = [warning, warning, warning, warning, warning];
