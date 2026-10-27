"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Where the parts of one run record what they claimed: a fresh directory per
// run, made by Jest's global setup before it spawns the workers that inherit it.
const CLAIMS_ENV = "WEBPACK_TEST_CLAIMS";

/**
 * This run's part of a test file `--parts=<n>` splits, as `[part, parts]` from
 * 1; `[1, 1]` without the flag, so the one part runs everything.
 * @returns {[number, number]} this part and how many there are
 */
const currentPart = () =>
	/** @type {{ __TEST_PART__?: [number, number] }} */ (globalThis)
		.__TEST_PART__ || [1, 1];

/**
 * Tells whether this part runs the work named `key`, by a hash of the name, so
 * a key keeps its part however the others around it change.
 * @param {string} key a name unique to one piece of work
 * @returns {boolean} true when this part runs it
 */
const isInPart = (key) => {
	const [part, parts] = currentPart();
	if (parts === 1) return true;
	// FNV-1a
	let hash = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
	}
	return (hash >>> 0) % parts === part - 1;
};

/**
 * Makes the directory the parts of this run claim work in, for Jest's global
 * setup to call before it spawns the workers.
 * @returns {void}
 */
const createClaims = () => {
	process.env[CLAIMS_ENV] = fs.mkdtempSync(
		path.join(os.tmpdir(), "webpack-test-claims-")
	);
};

/**
 * Removes the directory `createClaims` made, for Jest's global teardown.
 * @returns {void}
 */
const removeClaims = () => {
	const directory = process.env[CLAIMS_ENV];
	if (!directory || !fs.existsSync(directory)) return;
	// Not `fs.rmSync`, which Node.js 10 lacks; every claim is an empty directory.
	for (const name of fs.readdirSync(directory)) {
		fs.rmdirSync(path.join(directory, name));
	}
	fs.rmdirSync(directory);
};

/**
 * Tells whether this part runs the work named `key`, claiming it for this part
 * when no part has yet: the first part to ask takes it, so a part that finishes
 * its work early takes more and the parts end together.
 * @param {string} key a name unique to one piece of work
 * @returns {boolean} true when this part runs it
 */
const claimInPart = (key) => {
	if (currentPart()[1] === 1) return true;
	const directory = /** @type {string} */ (process.env[CLAIMS_ENV]);
	const name = crypto.createHash("sha1").update(key).digest("hex");
	try {
		fs.mkdirSync(path.join(directory, name));
		return true;
	} catch (err) {
		if (/** @type {NodeJS.ErrnoException} */ (err).code === "EEXIST") {
			return false;
		}
		throw err;
	}
};

module.exports = {
	claimInPart,
	createClaims,
	currentPart,
	isInPart,
	removeClaims
};
