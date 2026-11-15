"use strict";

/**
 * @param {unknown} _node the node the comment is attached to
 * @param {{ value: string }} comment the comment
 * @returns {boolean} whether the minifier keeps it
 */
const keepKept = (_node, comment) => /kept/.test(comment.value);

/**
 * @param {unknown} _node the node the comment is attached to
 * @param {{ value: string }} comment the comment
 * @returns {boolean} whether the minifier takes it out into the extracted list
 */
const extractLicense = (_node, comment) => /license/i.test(comment.value);

module.exports = { extractLicense, keepKept };
