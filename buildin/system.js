/* global System */
// "fix" for users of "System" global
module.exports = typeof System === "undefined" ? {} : System;
