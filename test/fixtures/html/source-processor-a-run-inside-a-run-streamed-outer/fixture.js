"use strict";

/**
 * @returns {string} a document past the streamed walk's 49,152 nodes
 */
const source = () => `<div>${"<p>a</p>".repeat(30000)}</div><em>end</em>`;

module.exports = { source };
