var cp = require('child_process');
var path = require("path");
var fs = require("fs");

var cmds = fs.readdirSync(__dirname).filter(function(dirname) {
	return fs.statSync(path.join(__dirname, dirname)).isDirectory();
}).sort().map(function(dirname) {
	return "cd " + dirname + " && node build.js";
});

var stack = function() {
	console.log("done");
};
for(var i = cmds.length-1; i >= 0; i--) {
	var cmd = cmds[i];
	stack = (function(next, cmd) {
		return function() {
			console.log(cmd);
			cp.exec(cmd, function(error, stdout, stderr) {
				if(error) console.error(error);
				else if(stderr) console.error(stderr), next();
				else next();
			});
		}
	}(stack, cmd));
}
stack();