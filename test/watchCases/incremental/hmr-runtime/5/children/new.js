var state = require("../state");
module.exports = 30;
module.hot.dispose(function() { state.disposed.push("child:30"); });
