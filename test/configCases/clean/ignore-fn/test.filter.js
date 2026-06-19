"use strict";

// Deno's `fs.readdirSync` returns entries in a different order than Node, so this
// case's exact-order `readDir` snapshot of the cleaned output directory does not
// match; skip under Deno (CleanPlugin itself behaves the same).
module.exports = () => !process.versions.deno;
