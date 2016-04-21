var path = require("path");
var fs = require("fs");

var fixtures = path.join(__dirname, "fixtures");

try {
	fs.mkdirSync(fixtures);
} catch(e) {}

function genModule(prefix, depth, asyncDepth, multiplex, r, circular) {
	var source = [];
	var async = depth >= asyncDepth;
	if(!async)
		circular.push(path.resolve(fixtures, prefix + "/index.js"));
	source.push("(function() {");
	var m = (r % multiplex) + 1;
	var sum = 1;
	try {
		fs.mkdirSync(path.resolve(fixtures, prefix));
	} catch(e) {}
	if(depth > 0) {
		for(var i = 0; i < m; i++) {
			sum += genModule(prefix + "/" + i, depth - 1, asyncDepth, multiplex, (r + i + depth) * m + i + depth, circular);
			source.push("require(" + JSON.stringify("./" + i) + ");");
			if(i === 0) {
				if(async)
					source.push("}); require.ensure([], function() {");
			}
		}
		var item = circular[r % circular.length];
	}
	source.push("}, " + JSON.stringify(prefix) + ");");
	if(item)
		source.push("require(" + JSON.stringify(item) + ");");
	source.push("module.exports = " + JSON.stringify(prefix) + ";");
	fs.writeFileSync(path.resolve(fixtures, prefix + "/index.js"), source.join("\n"), "utf-8");
	return sum;
}

for(var i = 2; i < 14; i++) {
	var count = genModule("tree-" + i, 6, 100, i, 0, []);
	console.log("generated tree", i, count);
}

for(var i = 2; i < 14; i++) {
	var count = genModule("async-tree-" + i, 6, 1, i, 0, []);
	console.log("generated async tree", i, count);
}

var a = genModule("module-async", 7, 1, 3, 2, []);

var b = genModule("module-big-async", 5, 2, 9, 2, []);

var c = genModule("module-broad-async", 3, 3, 20, 10, []);

console.log("generated modules", a, b, c);
