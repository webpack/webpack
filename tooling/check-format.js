/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// `fmt:check`: Prettier over every file ESLint's `prettier/prettier` rule does
// not already format, so `yarn lint` formats each JavaScript file once.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ESLint } = require("eslint");
const prettier = require("prettier");

const root = path.resolve(__dirname, "..");

// WHY: Prettier resolves an ignore file's patterns against its own directory,
// so the list of files ESLint formats has to sit in the root. It is
// gitignored and removed after every run.
const ESLINT_FORMATTED_IGNORE_FILE = ".prettierignore-eslint";

// WHY: eslint-plugin-prettier formats a whole file only when Prettier parses it
// as JavaScript; for Markdown and other processed files it sees fragments or
// skips them, so an enabled rule alone doesn't mean the file was formatted.
const WHOLE_FILE_PARSERS = new Set(["babel", "babel-ts", "flow", "typescript"]);

/**
 * @returns {Promise<(file: string) => boolean>} whether Prettier parses a file with a whole-file JavaScript parser
 */
const createIsJavaScriptFile = async () => {
	const { languages } = await prettier.getSupportInfo();
	/** @type {Set<string>} */
	const extensions = new Set();
	/** @type {Set<string>} */
	const filenames = new Set();
	for (const language of languages) {
		if (!language.parsers.some((parser) => WHOLE_FILE_PARSERS.has(parser))) {
			continue;
		}
		for (const extension of language.extensions || []) {
			extensions.add(extension);
		}
		for (const filename of language.filenames || []) filenames.add(filename);
	}
	return (file) =>
		filenames.has(path.basename(file)) || extensions.has(path.extname(file));
};

/**
 * @returns {string[]} files git tracks or would track, relative to the root
 */
const listFiles = () =>
	execFileSync(
		"git",
		["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
		{ cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }
	)
		.split("\0")
		.filter(Boolean);

/**
 * @param {ESLint} eslint ESLint instance using the repository config
 * @param {string} file file relative to the root
 * @returns {Promise<boolean>} true when `yarn lint:code` runs `prettier/prettier` on the file
 */
const hasPrettierRule = async (eslint, file) => {
	if (await eslint.isPathIgnored(file)) return false;
	const config = await eslint.calculateConfigForFile(file);
	const rule = config && config.rules && config.rules["prettier/prettier"];
	const severity = Array.isArray(rule) ? rule[0] : rule;
	return severity === 2 || severity === "error";
};

/**
 * @param {string} file file relative to the root
 * @returns {string} an ignore-file pattern matching exactly that file
 */
const toPattern = (file) =>
	`/${file
		.split(path.sep)
		.join("/")
		.replace(/[\\*?[\]]/g, "\\$&")
		.replace(/ $/, "\\ ")}`;

const main = async () => {
	const eslint = new ESLint({ cwd: root });
	const isJavaScriptFile = await createIsJavaScriptFile();
	/** @type {string[]} */
	const patterns = [];
	for (const file of listFiles()) {
		if (isJavaScriptFile(file) && (await hasPrettierRule(eslint, file))) {
			patterns.push(toPattern(file));
		}
	}
	const ignoreFile = path.join(root, ESLINT_FORMATTED_IGNORE_FILE);
	fs.writeFileSync(ignoreFile, `${patterns.join("\n")}\n`);
	try {
		execFileSync(
			process.execPath,
			[
				require.resolve("prettier/bin/prettier.cjs"),
				"--cache",
				"--ignore-unknown",
				"--ignore-path",
				".gitignore",
				"--ignore-path",
				".prettierignore",
				"--ignore-path",
				ESLINT_FORMATTED_IGNORE_FILE,
				"--check",
				"."
			],
			{ cwd: root, stdio: "inherit" }
		);
	} catch (_err) {
		// Prettier already printed the files it rejected.
		process.exitCode = 1;
	} finally {
		fs.unlinkSync(ignoreFile);
	}
};

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
