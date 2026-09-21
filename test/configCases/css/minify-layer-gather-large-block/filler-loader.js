"use strict";

// The gather this case is about is only reached by a block big enough to stream
// its own body, which is a few thousand rules. Generated here rather than
// checked in, so the fixture states the shape and not the bulk.
const RULES = 3400;

/**
 * @param {string} source the stylesheet
 * @returns {string} it, with the filler marker expanded
 */
module.exports = function fillerLoader(source) {
	let filler = "";
	for (let i = 0; i < RULES; i++) filler += `.f${i}{top:${i + 1}px}`;
	return source.replace("/* FILLER */", filler);
};
