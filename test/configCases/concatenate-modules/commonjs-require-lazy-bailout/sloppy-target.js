// no "use strict": bails out of the concatenation, so it stays a real module
global.__lazyBailoutOrder = (global.__lazyBailoutOrder || []).concat("sloppy");

exports.v = "sloppy";
