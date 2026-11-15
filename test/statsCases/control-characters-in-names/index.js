import a from "./a.js?\u001b[31mRED\u001b[0m\rMARK";

import(/* webpackChunkName: "chunk\u001b[1mBOLD" */ "./a.js");

console.log(a);
