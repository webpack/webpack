var cp = require('child_process');

function result(error, stdout, stderr) {
	console.log(stderr);
}

cp.exec("cd code-splitted-require.context && node build.js", result);
cp.exec("cd code-splitting && node build.js", result);
cp.exec("cd coffee-script && node build.js", result);
cp.exec("cd loader && node build.js", result);
cp.exec("cd require.context && node build.js", result);
cp.exec("cd code-splitting-bundle-loader && node build.js", result);
cp.exec("cd commonjs && node build.js", result);