window.test(true, "index.js should be replaced with index.web.js");
window.test(window.libary1, "libary1 loaded");
window.test(window.libary2.ok, "libary2 loaded");
require.ensure("subcontent", function(require) {
	// Comments work!
	exports.ok = true;
	window.test(require("subcontent") === "replaced", "node_modules should be replaced with web_modules");
	window.test(require("subcontent2/file.js") === "orginal", "node_modules should still work when web_modules exists");
});
setTimeout(function() {
	window.test(exports.ok, "asnyc loaded, exports is still avaible");
}, 3000);

window.test(require("./circular") === 1, "circular require should work");
window.test(require("./singluar.js").value === 1, "sigular module loaded");
require("./singluar.js").value = 2;
window.test(require("./singluar").value === 2, "exported object is singluar");
window.test(require("subfilemodule") === "subfilemodule", "Modules as single file should load");

require.ensure([], function(require) {
	require("./acircular");
	require("./duplicate");
	require("./duplicate2");
});
require.ensure([], function(require) {
	require("./acircular2");
	require("./duplicate");
	require("./duplicate2");
});
var sum = 0;
require.ensure([], function(require) {
	require("./duplicate");
	require("./duplicate2");
	sum++;
});
require.ensure([], function(require) {
	require("./duplicate");
	require("./duplicate2");
	sum++;
});
setTimeout(function() {
	window.test(sum === 2, "Multiple callbacks on code load finish");
}, 3000);
