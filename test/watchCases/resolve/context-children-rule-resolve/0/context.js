const context = require.context("./dir", false, /^\.\/[ab]\.js$/);

module.exports = context.keys().map(context);
