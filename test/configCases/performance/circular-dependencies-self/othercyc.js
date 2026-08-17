const self = require("./selfcyc");

exports.other = 2;
exports.both = module.exports.other;
exports.getSelf = () => self.x;
