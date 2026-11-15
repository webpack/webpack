const target = require("./binding-mutated");
target.a = "mutated";
exports.unrelated = 4;
