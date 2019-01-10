"use strict";

const dir = process.argv[2];
const bin = process.argv[3];
process.argv.splice(1, 2);
process.chdir(dir);

require(bin);
