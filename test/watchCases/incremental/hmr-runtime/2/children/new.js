var state = require("../state");
module.exports = 20;
module.hot.dispose(function() { state.disposed.push("child:20"); });
