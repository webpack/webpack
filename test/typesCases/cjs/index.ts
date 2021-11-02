require.include("./a");
require.resolveWeak("./a");
require.ensure(["./a"], (require) => {
	require("./b");
});
require.ensure(["./a"], (require) => {
	require("./b");
}, err => {}, "name1");
const context = require.context("ctx");
context.keys();
context.id;
context.resolve("./a");
require.context("ctx", true, /.*\.js/, 'sync');
