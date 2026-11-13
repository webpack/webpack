"use strict";

// What `configCases/css/minify-css/minify-layer-gather-large-block` minifies:
// its `style.css` with the filler loader's 3400 rules in place of the marker.
const RULES = 3400;

/**
 * @returns {string} one layer written twice, the second block big enough to stream its own body, beside a layer named once and another layer
 */
const source = () => {
	let filler = "";
	for (let i = 0; i < RULES; i++) filler += `.f${i}{top:${i + 1}px}`;
	return `/* One layer, written twice. The second block is big enough to stream its own
   body, which is where the gather used to lose it — the two then printed as two
   blocks of one layer, which a second pass wrote as one. */
@layer app {
	@layer a { .first { top: 0 } }
	@layer a { ${filler} .last { bottom: 0 } }
}

/* An anonymous block is a layer of its own, so a second one gathers with
   nothing however big it is. */
@layer solo { .kept { left: 0 } }

/* A block naming another layer is left where it was written. */
@layer other { .elsewhere { right: 0 } }
`;
};

module.exports = { source };
