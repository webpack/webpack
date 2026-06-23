"use strict";

// Uses the Bun runtime (the `Bun` global / web globals like fetch); Bun only.
module.exports = () => typeof Bun !== "undefined";
