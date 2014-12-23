var EnvPlugin = require("../../../../lib/EnvPlugin");
process.env.AAA = "aaa";
process.env.BBB = "bbb";
process.env.CCC = "123";
module.exports = [{
  plugins: [
    new EnvPlugin("AAA")
  ]
}, {
  plugins: [
    new EnvPlugin("BBB", "CCC")
  ]
}, {
  plugins: [
    new EnvPlugin("DDD")
  ]
}];
