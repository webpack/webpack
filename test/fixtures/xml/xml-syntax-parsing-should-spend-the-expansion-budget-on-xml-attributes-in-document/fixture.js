"use strict";

/**
 * @returns {string} three references to an entity whose expansions pass the budget
 */
const source = () => `<!DOCTYPE r [<!ENTITY e "${"x".repeat(
	400000
)}">]><r><a v="&e;" p="1"/><b p="2" v="&e;"/><c v="&e;" p="3"/></r>`;

module.exports = { source };
