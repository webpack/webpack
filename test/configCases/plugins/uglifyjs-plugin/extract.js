/** @preserve comment should be extracted extract-test.1 */

var foo = {};

// comment should be stripped extract-test.2

/*!
 * comment should be extracted extract-test.3
 */

/**
 * comment should be stripped extract-test.4
 */

module.exports = foo;
