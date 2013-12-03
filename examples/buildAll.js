var cp = require('child_process');

var cmds = [
	"cd code-splitted-require.context && node build.js",
	"cd code-splitted-require.context-amd && node build.js",
	"cd code-splitting && node build.js",
	"cd coffee-script && node build.js",
	"cd loader && node build.js",
	"cd require.context && node build.js",
	"cd code-splitting-bundle-loader && node build.js",
	"cd commonjs && node build.js",
	"cd named-chucks && node build.js",
	"cd require.resolve && node build.js",
	"cd mixed && node build.js",
	"cd web-worker && node build.js",
	"cd i18n && node build.js",
	"cd labeled-modules && node build.js",
	"cd component && node build.js",
	"cd dedupe && node build.js",
	"cd code-splitted-dedupe && node build.js",
	"cd multiple-entry-points && node build.js",
];

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