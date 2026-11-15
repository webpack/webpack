"use strict";

const { callsOf, recordFunction } = require("../_shared/record");

// Predicates for each place `cssMinify` takes one: the plugin's
// `extractComments.condition`, `minimize.css.extractComments` and `comments`.
const extractTwo = recordFunction((comment) => comment.value.includes("two"));
const extractOne = recordFunction((comment) => comment.value.includes("one"));
const keepPlain = recordFunction((comment) => comment.includes("plain"));

module.exports = {
	check: callsOf({ extractOne, extractTwo, keepPlain }),
	extractOne,
	extractTwo,
	keepPlain
};
