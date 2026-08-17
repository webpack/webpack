/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ownership = require("./rules/ownership");

/** @typedef {import("eslint").ESLint.Plugin} Plugin */

/** @type {Plugin} */
const plugin = {
	meta: { name: "ironclad", version: "0.0.0" },
	rules: { ownership }
};

module.exports = plugin;
