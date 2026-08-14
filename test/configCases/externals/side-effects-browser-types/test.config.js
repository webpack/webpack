"use strict";

// a kept `script` external loads its url on evaluation, which the script
// external's own test cases cover — this one is about which externals the
// output still references
module.exports = {
	noTests: true
};
