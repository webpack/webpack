// This file doesn't accept itself neither the parent accepts it.
// On change it will bubble to all parents (which is 'element.js'),
//  this parent is accepted by 'index.js'.
// So on change 'element-dependency.js' and 'element.js' will be reloaded.

module.exports = "This text comes from <b>'element-dependency.js'</b> version 1.";