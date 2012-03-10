var cp = require('child_process');

var argv = process.argv;
argv.shift();
argv.shift();
var extraArgs = argv.join(" ");

cp.exec("node ../../bin/webpack.js "+extraArgs+" --single --libary libary1 node_modules/libary1 js/libary1.js", function (error, stdout, stderr) {
	console.log('libary1 stdout:\n' + stdout);
	console.log('libary1 stderr:\n ' + stderr);
	if (error !== null) {
		console.log('libary1 error: ' + error);
	}
});
cp.exec("node ../../bin/webpack.js "+extraArgs+" --script-src-prefix js/ --libary libary2 node_modules/libary2 js/libary2.js", function (error, stdout, stderr) {
	console.log('libary2 stdout:\n' + stdout);
	console.log('libary2 stderr:\n ' + stderr);
	if (error !== null) {
		console.log('libary2 error: ' + error);
	}
});
cp.exec("node ../../bin/webpack.js "+extraArgs+" --script-src-prefix js/ lib/index js/web.js", function (error, stdout, stderr) {
	console.log('web stdout:\n' + stdout);
	console.log('web stderr:\n ' + stderr);
	if (error !== null) {
		console.log('web error: ' + error);
	}
});