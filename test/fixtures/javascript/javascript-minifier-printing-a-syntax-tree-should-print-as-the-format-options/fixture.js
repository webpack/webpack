"use strict";

/**
 * @param {unknown} _node the node the comment is attached to
 * @param {{ value: string }} comment the comment
 * @returns {boolean} whether the printer keeps it
 */
const keepComment = (_node, comment) => comment.value.includes("keep");

module.exports = { keepComment };
