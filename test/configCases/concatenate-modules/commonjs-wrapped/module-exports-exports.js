"use strict";

// the chained assignment repoints the local `exports` alias, so the later
// `exports.y =` write still lands on the new module.exports object
module.exports = exports = { z: 9 };
exports.y = 10;
