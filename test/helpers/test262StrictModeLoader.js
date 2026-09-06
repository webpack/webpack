"use strict";

/**
 * Applies test262's strict-mode transformation, which INTERPRETING.md defines as
 * inserting the directive plus a newline as the file's initial character sequence.
 * @param {string} source the test file's source
 * @returns {string} the same source, parsed as strict mode code
 */
module.exports = (source) => `"use strict";\n${source}`;
