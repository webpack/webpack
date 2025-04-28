global.NO_PUBLIC_PATH = true;

const cp = require("child_process");
const path = require("path");
const fs = require("fs");

cp.exec("node-gyp configure build", (error, stdout, stderr) => {
	if (stderr) {
		console.log(stderr);
	}

	if (error !== null) {
		console.log(error);
	}

	fs.copyFile(path.resolve(__dirname, "./build/Release/file.node"), path.resolve(__dirname, './file.node'), (err) => {
		if (err) {
			console.log(err);
		}

		require("../build-common");
	});
});


