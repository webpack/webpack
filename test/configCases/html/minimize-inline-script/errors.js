"use strict";

// The body is offered to a renderer by language, and the dispatcher reads a
// language alone, so the parse goal `as` names never reaches the JS minifier.
module.exports = [[/Unexpected token: name \(Promise\)/]];
