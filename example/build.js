var cp = require('child_process');

var argv = process.argv;
argv.shift();
argv.shift();
var extraArgs = argv.join(" ");

cp.exec("node ../bin/webpack.js "+extraArgs+" example.js js/output.js", function (error, stdout, stderr) {
	console.log('stdout:\n' + stdout);
	console.log('stderr:\n ' + stderr);
	if (error !== null) {
		console.log('error: ' + error);
	}
});
