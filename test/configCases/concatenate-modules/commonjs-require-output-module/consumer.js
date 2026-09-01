const whole = require("./esm-target.mjs");
const member = require("./cjs-target.cjs").value;
const constructed = new require("./object-target.cjs");

export { constructed, member, whole };
