var state = require("../state");
module.exports = 10;
module.hot.dispose(function() { state.disposed.push("child:10"); });
