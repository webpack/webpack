"use strict";

/**
 * @returns {string} a document of nothing but short start tags, 5000 deep
 */
const source = () => "<i>".repeat(5000);

module.exports = { source };
