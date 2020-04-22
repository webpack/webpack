const Test = require('./exports-default').default;
const test = new Test();
module.exports.hello = test.getString();