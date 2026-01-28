/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const async = require("neo-async");
const tc = require("./template-common");

const extraArgs = "";

// @ts-expect-error we are touching global
const targetArgs = global.NO_TARGET_ARGS
	? ""
	: "--entry ./example.js --output-filename output.js";
// @ts-expect-error we are touching global
const displayReasons = global.NO_REASONS
	? ""
	: "--stats-reasons --stats-used-exports --stats-provided-exports";
// @ts-expect-error we are touching global
const statsArgs = global.NO_STATS_OPTIONS
	? ""
	: "--stats-chunks  --stats-modules-space 99999 --stats-chunk-origins";
// @ts-expect-error we are touching global
const publicPathArgs = global.NO_PUBLIC_PATH
	? ""
	: '--output-public-path "dist/"';
// @ts-expect-error we are touching global
const statsColorsArg = global.STATS_COLORS ? "" : "--no-color";
const commonArgs = `${statsColorsArg} ${statsArgs} ${publicPathArgs} ${extraArgs} ${targetArgs}`;

let readme = fs.readFileSync(
	require("path").join(process.cwd(), "template.md"),
	"utf8"
);

/**
 * @param {string} args args
 * @param {string} prefix prefix
 * @param {() => void} callback callback
 */
const doCompileAndReplace = (args, prefix, callback) => {
	if (!tc.needResults(readme, prefix)) {
		callback();
		return;
	}

	/**
	 * @param {string} dir the directory for deleting
	 */
	const deleteFiles = (dir) => {
		const targetDir = path.resolve("dist", dir);

		if (path.extname(targetDir) === "") {
			for (const file of fs.readdirSync(targetDir)) {
				deleteFiles(path.join(targetDir, file));
			}
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
	} catch (err) {
		throw new Error("Please install webpack-cli at root.", { cause: err });
	}

	/**
	 * @param {import("child_process").ChildProcess} subprocess a subprocess
	 */
	const connectIO = (subprocess) => {
		const { stdin, stdout, stderr } = process;
		const { stdin: _stdin, stdout: _stdout, stderr: _stderr } = subprocess;
		/** @type {[NodeJS.ReadStream, import("stream").Writable][]} */
		const inputPair = [
			[stdin, /** @type {import("stream").Writable} */ (_stdin)]
		];
		/** @type {[NodeJS.WritableStream, import("stream").Readable][]} */
		const outputPair = [
			[stdout, /** @type {import("stream").Readable} */ (_stdout)],
			[stderr, /** @type {import("stream").Readable} */ (_stderr)]
		];
		for (const pair of inputPair) {
			pair[0].pipe(pair[1]);
		}
		for (const pair of outputPair) {
			pair[1].pipe(pair[0]);
		}
		disconnectIO = () => {
			for (const pair of inputPair) {
				pair[0].unpipe(pair[1]);
			}
			for (const pair of outputPair) {
				pair[1].unpipe(pair[0]);
			}
		};
	};
	/** @type {null | (() => void)} */
	let disconnectIO = null;

	const subprocess = cp.exec(
		`node ${path.resolve(__dirname, "../bin/webpack.js")} ${args} ${displayReasons} ${commonArgs}`,
		(error, stdout, stderr) => {
			// eslint-disable-next-line no-unused-expressions
			disconnectIO && disconnectIO();
			if (stderr) console.log(stderr);
			if (error !== null) {
				console.log(error);
				throw error;
			}
			try {
				readme = tc.replaceResults(
					readme,
					process.cwd(),
					stdout
						.replace(/[\r?\n]*$/, "")
						.replace(
							/\d\d\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/g,
							"XXXX-XX-XX"
						)
						.replace(/([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/g, "XXXX:XX:XX")
						.replace(/webpack [0-9.]+/g, "webpack X.X.X"),
					prefix
				);
			} catch (err) {
				console.log(stderr);
				throw err;
			}
			callback();
		}
	);
	connectIO(subprocess);
};

async.series(
	[
		(callback) =>
			doCompileAndReplace(
				"--mode production --env production",
				"production",
				callback
			),
		(callback) =>
			doCompileAndReplace(
				"--mode development --env development --devtool none",
				"development",
				callback
			),
		(callback) =>
			doCompileAndReplace(
				"--mode none --env none --output-pathinfo verbose",
				"",
				callback
			)
	],
	() => {
		readme = tc.replaceBase(readme);
		fs.writeFile("README.md", readme, "utf8", () => {});
	}
);
