"use strict";

/**
 * Puts test262's "strict" scenario directive where webpack's parser reads it.
 * It stays on line 1 so every diagnostic still points at the source's own line.
 * @param {string} source the test file's source
 * @returns {string} the same source, parsed as strict mode code
 */
module.exports = (source) => `"use strict";${source}`;
