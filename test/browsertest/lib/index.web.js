// Should not break it... should not include complete directory...
require = require("enhanced-require")(module);
if(typeof define != "function") var define = require.define;

window.test(true, "index.js should be replaced with index.web.js");
window.test(new(require("./constructor"))(1234).value == 1234, "Parse require in new(...) should work");
window.test(new ( require ( "./constructor" ) ) ( 1234 ) .value == 1234, "Parse require in new(...) should work, with spaces");
require("script!../js/libary1.js");
window.test(window.libary1, "libary1 loaded");
window.test(window.libary2.ok, "libary2 loaded");
require.ensure("subcontent", function(require) {
	// Comments work!
	exports.ok = true;
	window.test(require("subcontent") === "replaced", "node_modules should be replaced with web_modules");
	window.test(require("subcontent-jam") === "replaced", "node_modules should be replaced with jam");
	window.test(require("subcontent2/file.js") === "orginal", "node_modules should still work when web_modules exists");
});
setTimeout(function() {
	window.test(exports.ok, "asnyc loaded, exports is still avaible");
}, 3000);

window.test(require("./circular") === 1, "circular require should work");
window.test(require("./singluar.js").value === 1, "sigular module loaded");
window.test((require("./singluar.js")).value === 1, "sigular module loaded, in brackets");
require("./sing" + "luar.js").value = 2;
window.test(require("./singluar").value === 2, "exported object is singluar");
window.test(require("subfilemodule") === "subfilemodule", "Modules as single file should load");
window.test(require.context("../templates")("./tmpl") === "test template", "Context should work");
window.test((require.context("../templates"))("./tmpl") === "test template", "Context should work, in brackets");
window.test((require.context("../templates")("./tmpl")) === "test template", "Context should work, in brackets2");
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
window.test(typeof module.id === "number", "module.id should be a number");
window.test(module.id === require.resolve("./index.web.js"), "module.id should be a id of the module");

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
window.test(require("css!../css/stylesheet.css").indexOf(".rule-direct") !== -1, "Buildin 'css' loader, direct content");
window.test(require("css!../css/stylesheet.css").indexOf(".rule-import1") !== -1, "Buildin 'css' loader, imported rule");
window.test(require("css!../css/stylesheet.css").indexOf(".rule-import2") !== -1, "Buildin 'css' loader, double imported rule");
window.test(require("css!val!../css/generateCss").indexOf("generated") !== -1, "Buildin 'val' loader, combined with css");
window.test(require("css!val!../css/generateCss").indexOf(".rule-import2") !== -1, "Buildin 'val' loader, combined with css, imported css");
window.test(require("raw!val!../css/generateCss").indexOf("generated") !== -1, "Buildin 'val' loader, combined with raw");
window.test(require("less!../less/stylesheet.less").indexOf(".less-rule-direct") !== -1, "Buildin 'less' loader, direct content");
window.test(require("less!../less/stylesheet.less").indexOf(".less-rule-import1") !== -1, "Buildin 'less' loader, imported rule");
window.test(require("less!../less/stylesheet.less").indexOf(".less-rule-import2") !== -1, "Buildin 'less' loader, double imported rule");
// Buildin 'style' loader adds css to document
require("../css/stylesheet.css");
require("../less/stylesheet.less");

// file loader
window.test(require("file/png!../img/image.png").indexOf("js/") >= 0, "Buildin 'file' loader, png");
setTimeout(function() {
	document.getElementById("image").src = require("file/png!../img/image.png");
}, 200);

// Loader & Context
var abc = "abc", scr = "script.coffee";
window.test(require("../resources/" + scr) === "coffee test", "context should process extensions");
window.test(require("raw!../resources/" + abc + ".txt") === "abc", "raw loader with context");

// require behavior
var singlarObj = require("./singluar2");
var singlarId = require.resolve("./singluar2");
var singlarIdInConditional = require.resolve(true ? "./singluar2" : "./singluar");
window.test(typeof singlarId == "number", "require.resolve returns a id");
window.test(singlarIdInConditional === singlarId, "require.resolve returns a id if in conditional");
window.test(typeof require.cache[singlarId] == "object", "require.cache can be read");
delete require.cache[singlarId];
window.test(require("./singluar2") !== singlarObj, "require.cache can be deleted");


// AMD
var template = "tmpl";
var amdLoaded = "";
require(["./circular", "../templates/" + template, true ? "./circular" : "./circular"], function(circular, testTemplate, circular2) {
	window.test(circular === 1, "AMD-style requires should work");
	window.test(circular2 === 1, "AMD-style requires should work with conditionals");
	window.test(testTemplate === "test template", "AMD-style requires should work with context");
	amdLoaded+=1;
});
define("name", ["./circular"], function(circular) {
	window.test(circular === 1, "AMD-style requires should work, in define");
	amdLoaded+=2;
});
define("name", [], function() {
	amdLoaded+=3;
});
define(["./circular"], function(circular) {
	window.test(circular === 1, "AMD-style requires should work, in define without name");
	amdLoaded+=4;
});
define("blaa", function() {
	amdLoaded+=5;
});
var obj = {};
define("blaaa", obj);
window.test(obj === module.exports, "AMD-style define exports a object");
var _test_require = require.valueOf();
var _test_exports = module.exports;
var _test_module = module;
define(function(require, exports, module) {
	window.test(typeof require == "function", "AMD-style define CommonJs: require is function");
	window.test(exports == _test_exports, "AMD-style define CommonJs: exports is correct");
	window.test(module == _test_module, "AMD-style define CommonJs: module is correct");
	window.test(require("./circular") === 1, "AMD-style requires should work, in define without name and requires");
	amdLoaded+=6;
});
require(["./circular"]);
require(["./c"], function(c) {
	window.test(c === "c", "AMD-style require should work, in chunk");
	window.test(require("./d") === "d", "AMD-style require should work, in chunk");
	amdLoaded+=7;
});
window.test(amdLoaded == "123456", "AMD-style require should work (sync) "+amdLoaded);
setTimeout(function() {
	window.test(amdLoaded == "1234567", "AMD-style require should work (async) " + amdLoaded);
}, 1500);

// cross module system support
window.test(typeof require === "function", "require should be a function");
window.test(typeof define === "function", "define should be a function");
window.test(require.amd, "require.amd should be true");
window.test(define.amd, "define.amd should be true");
window.test(typeof module === "object", "module should be a object");




// Tests from node.js
require("bundle!../nodetests");
