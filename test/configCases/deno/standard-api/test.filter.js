"use strict";

// Uses Deno's standard runtime API (the `Deno` global), available only under Deno.
module.exports = () => typeof Deno !== "undefined";
