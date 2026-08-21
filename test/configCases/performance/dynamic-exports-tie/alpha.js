// A computed key: webpack cannot read this statically.
const key = String(Date.now());

module.exports[key] = 1;
module.exports.known = 2;
