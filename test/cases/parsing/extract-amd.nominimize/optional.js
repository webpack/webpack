module.exports = 2;
try { module.exports.a = require("./a"); } catch (e) {};
try { module.exports.b = require("./b"); } catch (e) {};
