/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const cp = require("child_process");
const path = require("path");
const tc = require("./template-common");
const fs = require("fs");
const async = require("neo-async");

const extraArgs = "";

const targetArgs = global.NO_TARGET_ARGS ? "" : "--entry ./example.js --output-filename output.js";
const displayReasons = global.NO_REASONS ? "" : "--stats-reasons --stats-used-exports --stats-provided-exports";
const statsArgs = global.NO_STATS_OPTIONS ? "" : "--stats-chunks  --stats-modules-space 99999 --stats-chunk-origins";
const publicPathArgs = global.NO_PUBLIC_PATH ? "" : '--output-public-path "dist/"';
const statsColorsArg = global.STATS_COLORS ? "" : "--no-stats-colors";
const commonArgs = `${statsColorsArg} ${statsArgs} ${publicPathArgs} ${extraArgs} ${targetArgs}`;

let readme = fs.readFileSync(require("path").join(process.cwd(), "template.md"), "utf-8");

const doCompileAndReplace = (args, prefix, callback) => {
	if (!tc.needResults(readme, prefix)) {
		callback();
		return;
	}

	const deleteFiles = (dir) => {
		const targetDir = path.resolve("dist", dir);

		if (path.extname(targetDir) === "") {
			fs.readdirSync(targetDir).forEach((file) => {
				deleteFiles(path.join(targetDir, file));
			});
		} else {
			fs.unlinkSync(targetDir);
		}
	};

	if (fs.existsSync("dist")) {
		for (const dir of fs.readdirSync("dist")) {
			deleteFiles(dir);
		}
	}

	try {
		require.resolve("webpack-cli");
	} catch (e) {
		throw new Error("Please install webpack-cli at root.");
	}

	const connectIO = (subprocess) => {
		const { stdin, stdout, stderr } = process;
		const { stdin: _stdin, stdout: _stdout, stderr: _stderr } = subprocess;
		const inputPair = [[stdin, _stdin]];
		const outputPair = [[stdout, _stdout], [stderr, _stderr]];
		inputPair.forEach(pair => {
			pair[0].pipe(pair[1])
		})
		outputPair.forEach(pair => {
			pair[1].pipe(pair[0])
		})
		disconnectIO = () => {
			inputPair.forEach(pair => {
				pair[0].unpipe(pair[1])
			})
			outputPair.forEach(pair => {
				pair[1].unpipe(pair[0])
			})
		}
	}
	let disconnectIO = null;

	const subprocess = cp.exec(`node ${path.resolve(__dirname, "../bin/webpack.js")} ${args} ${displayReasons} ${commonArgs}`, (error, stdout, stderr) => {
		disconnectIO && disconnectIO();
		if (stderr)
			console.log(stderr);
		if (error !== null)
			console.log(error);
		try {
			readme = tc.replaceResults(readme, process.cwd(), stdout.replace(/[\r?\n]*$/, ""), prefix);
		} catch (e) {
			console.log(stderr);
			throw e;
		}
		callback();
	});
	connectIO(subprocess);
};

async.series([
	callback => doCompileAndReplace("--mode production --env production", "production", callback),
	callback => doCompileAndReplace("--mode development --env development --devtool none", "development", callback),
	callback => doCompileAndReplace("--mode none --env none --output-pathinfo verbose", "", callback)
], () => {
	readme = tc.replaceBase(readme);
	fs.writeFile("README.md", readme, "utf-8", function () { });
});
