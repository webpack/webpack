"use strict";

// Uses the Deno runtime (the `Deno` global / web globals like fetch); Deno only.
module.exports = () => typeof Deno !== "undefined";
