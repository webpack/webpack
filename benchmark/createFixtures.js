var path = require("path");
var fs = require("fs");

var fixtures = path.join(__dirname, "fixtures");


for(var i = 0; i < 1000; i++) {
	var source = [];
	if(i > 8)
		source.push("require("+ JSON.stringify("./" + (i / 8 | 0) + ".js") + ");");
	if(i > 4)
		source.push("require("+ JSON.stringify("./" + (i / 4 | 0) + ".js") + ");");
	if(i > 2)
		source.push("require("+ JSON.stringify("./" + (i / 2 | 0) + ".js") + ");");
	if(i > 0)
		source.push("require("+ JSON.stringify("./" + (i - 1) + ".js") + ");");
	source.push("module.exports = " + i + ";");
	fs.writeFileSync(path.join(fixtures, i + ".js"), source.join("\n"), "utf-8");
}

for(var i = 0; i < 1000; i++) {
	var source = [];
	source.push("require.ensure([], function(require) {");
	if(i > 8)
		source.push("require("+ JSON.stringify("./" + (i / 8 | 0) + ".async.js") + ");");
	if(i > 4)
		source.push("require("+ JSON.stringify("./" + (i / 4 | 0) + ".async.js") + ");");
	if(i > 2)
		source.push("require("+ JSON.stringify("./" + (i / 2 | 0) + ".async.js") + ");");
	if(i > 0)
		source.push("require("+ JSON.stringify("./" + (i - 1) + ".async.js") + ");");
	source.push("});");
	source.push("module.exports = " + i + ";");
	fs.writeFileSync(path.join(fixtures, i + ".async.js"), source.join("\n"), "utf-8");
}

for(var i = 0; i < 100; i++) {
	var source = [];
	if(i > 8)
		source.push("require("+ JSON.stringify("./" + (i / 8 | 0) + ".big.js") + ");");
	if(i > 4)
		source.push("require("+ JSON.stringify("./" + (i / 4 | 0) + ".big.js") + ");");
	if(i > 2)
		source.push("require("+ JSON.stringify("./" + (i / 2 | 0) + ".big.js") + ");");
	if(i > 0)
		source.push("require("+ JSON.stringify("./" + (i - 1) + ".big.js") + ");");
	for(var j = 0; j < 300; j++)
		source.push("if(Math.random())hello.world();test.a.b.c.d();x(1,2,3,4);var a,b,c,d,e,f;");
	source.push("module.exports = " + i + ";");
	fs.writeFileSync(path.join(fixtures, i + ".big.js"), source.join("\n"), "utf-8");
}
