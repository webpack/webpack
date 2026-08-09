"use strict";

// `this` is the exports object at module top level, and stays untouched
this.viaThis = "viaThis";
exports.readThis = `${this.viaThis}!`;
