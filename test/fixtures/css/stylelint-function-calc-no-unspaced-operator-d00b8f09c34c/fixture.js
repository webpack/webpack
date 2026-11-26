"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a { margin-top: calc(var(--some-variable) +\r\n\tvar(--some-other-variable)); }";

module.exports = { source };
