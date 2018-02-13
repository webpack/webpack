var foo = {};

// ⚠️ move the following comment back to the top
// https://github.com/mishoo/UglifyJS2/issues/2500
/** @preserve comment should be extracted extract-test.1 */

// comment should be stripped extract-test.2

/*!
 * comment should be extracted extract-test.3
 */

/**
 * comment should be stripped extract-test.4
 */

module.exports = foo;
