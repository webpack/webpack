"use strict";

/**
 * @param {import("../../../../..").Configuration[]} options compiler options
 * @returns {RegExp[]} one syntax error per configuration
 */
module.exports = (options) => options.map(() => /Module parse failed/);
