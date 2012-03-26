// Should not break it... should not include complete directory...
require = require("../../../require-polyfill")(require.valueOf());

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
require("./sing" + "luar.js").value = 2;
window.test(require("./singluar").value === 2, "exported object is singluar");
window.test(require("subfilemodule") === "subfilemodule", "Modules as single file should load");
window.test(require.context("../templates")("./tmpl") === "test template", "Context should work");
window.test(require . context ( "." + "." + "/" + "templ" + "ates" ) ( "./subdir/tmpl.js" ) === "subdir test template", "Context should work with subdirectories and splitted");
var template = "tmpl", templateFull = "./tmpl.js";
window.test(require("../templates/" + template) === "test template", "Automatical context should work");
window.test(require("../templates/templateLoader")(templateFull) === "test template", "Automatical context without prefix should work");
window.test(require("../templates/templateLoaderIndirect")(templateFull) === "test template", "Automatical context should work with require identifier");
window.test(function(require) { return require; }(1234) === 1234, "require overwrite in anonymos function");
function testFunc(abc, require) {
	return require;
}
window.test(testFunc(333, 678) === 678, "require overwrite in named function");
function testCase(number) {
	//window.test(require("./folder/file" + (number === 1 ? 1 : "2")) === "file" + number);
	window.test(require(number === 1 ? "../folder/file1" : number === 2 ? "../folder/file2" : number === 3 ? "../folder/file3" : "./missingModule") === "file" + number, "?: operator in require do not create context, test "+number);
}
testCase(1);
testCase(2);
testCase(3);
window.test(require("../folder/typeof") === "function", "typeof require should be function");

var error = null;
try {
	testCase(4);
} catch(e) {
	error = e;
}
window.test(error instanceof Error, "Missing module should throw Error, indirect");
error = null;
try {
	require("./missingModule2");
} catch(e) {
	error = e;
}
window.test(error instanceof Error, "Missing module should throw Error, direct");

require.ensure([], function(require) {
	var contextRequire = require.context(".");
	window.test(contextRequire("./singluar").value === 2, "Context works in chunk");
	var singl = "singl";
	window.test(require("." + "/" + singl + "uar").value === 2, "Context works in chunk, when splitted");
	window.test(typeof module.id === "string", "module.id should be a string");
	window.test(process.argv && process.argv.length > 1, "process.argv should be an array");
	process.nextTick(function() {
		sum2++;
	});
	process.on("xyz", function() {
		sum2++;
	});
	process.emit("xyz");
	window.test(window === global, "window === global");
	(function() {
		var require = 123;
		window.test(require === 123, "overwrite require via variable should be ok");
	}());
	(function() {
		var module = 1233;
		window.test(module === 1233, "overwrite module via variable should be ok");
	}());
});

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
var sum2 = 0;
setTimeout(function() {
	window.test(sum === 2, "Multiple callbacks on code load finish");
	window.test(sum2 === 2, "process.nextTick and process.emit/on should be polyfilled");
}, 3000);


// Loader tests
window.test(require("testloader!../resources/abc.txt") === "abcwebpack", "Loader in package.json");
window.test(require("testloader/lib/loader!../resources/abc.txt") === "abcwebpack", "Loader with .webpack-loader.js extention");
window.test(require("testloader/lib/loader.web-loader.js!../resources/abc.txt") === "abcweb", "Loader with .web-loader.js extention");
window.test(require("testloader/lib/loader.loader.js!../resources/abc.txt") === "abcloader", "Loader with .loader.js extention");
window.test(require("testloader/lib/loader-indirect!../resources/abc.txt") === "abcwebpack", "Loader with .js extention and requires in loader");
window.test(require("testloader!../loaders/reverseloader!../resources/abc.txt") === "cbawebpack", "Multiple loaders and relative paths");
window.test(require("raw!../resources/abc.txt") === "abc", "Buildin 'raw' loader");
window.test(require("jade!../resources/template.jade")({abc: "abc"}) === "<p>abc</p>", "Buildin 'jade' loader");
window.test(require("../resources/template.jade")({abc: "abc"}) === "<p>abc</p>", "Buildin 'jade' loader, by ext");
window.test(require("json!../../../package.json").name === "webpack", "Buildin 'json' loader");
window.test(require("../../../package.json").name === "webpack", "Buildin 'json' loader, by ext");
window.test(require("coffee!../resources/script.coffee") === "coffee test", "Buildin 'coffee' loader");
window.test(require("../resources/script.coffee") === "coffee test", "Buildin 'coffee' loader, by ext");
