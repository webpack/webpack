// A whole-namespace capture reads properties under their written names, so the
// mangler must leave them alone — even though the tracked access below allows it.
const whole = require("./target");

export const name = whole.NAME;
export const other = whole.OTHER;
export const direct = require("./target").NAME;
