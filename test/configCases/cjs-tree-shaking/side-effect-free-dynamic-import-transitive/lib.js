// No self-reference: the only reads are of another module's exports.
const dep = require("./dep.js");

global.__cjsTransitiveValue = dep.obj.value;

exports.y = dep.obj.value;
