// This file accepts neither itself nor does its parent accept it.
// On change it bubbles up to its parents ('element.js'), and that parent is
// accepted by 'index.js', so both are replaced together.

module.exports = "This text comes from <b>'element-dependency.js'</b>.";
