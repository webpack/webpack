/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Runs package scripts at the same time and fails when any of them fails.
// Usage: node tooling/run-parallel.js <script> [<script>...]

const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

/**
 * @param {string} script package script to run
 * @returns {Promise<number>} exit code of the script
 */
const runScript = (script) =>
	new Promise((resolve, reject) => {
		const yarn = process.env.npm_execpath;
		const child = yarn
			? spawn(process.execPath, [yarn, "run", "--silent", script], {
					cwd: root
				})
			: spawn("yarn", ["run", "--silent", script], { cwd: root, shell: true });
		/** @type {Buffer[]} */
		const output = [];
		child.stdout.on("data", (chunk) => output.push(chunk));
		child.stderr.on("data", (chunk) => output.push(chunk));
		child.on("error", reject);
		child.on("close", (code) => {
			// Each script's output is printed whole, so runs never interleave.
			process.stdout.write(`$ yarn ${script}\n${Buffer.concat(output)}`);
			resolve(code === null ? 1 : code);
		});
	});

const scripts = process.argv.slice(2);
if (scripts.length === 0) {
	throw new Error("Usage: node tooling/run-parallel.js <script> [<script>...]");
}

Promise.all(scripts.map(runScript)).then(
	(codes) => {
		process.exitCode = Math.max(0, ...codes);
	},
	(err) => {
		console.error(err);
		process.exitCode = 1;
	}
);
