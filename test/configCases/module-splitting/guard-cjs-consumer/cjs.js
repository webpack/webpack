// Reaches the same export through CommonJS, which the split analysis
// cannot follow — the module must stay unsplit.
module.exports = require("./lib").lazy;
