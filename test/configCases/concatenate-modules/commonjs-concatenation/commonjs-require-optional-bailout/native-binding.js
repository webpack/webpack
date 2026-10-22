// no "use strict": bails out of the concatenation, stands in for an optional
// native dependency that is missing at runtime
module.exports = { impl: "native" };

throw new Error("native binding missing");
