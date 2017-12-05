// We test that the CLI define for TEST will override the one defined in
// webpack.config.js. If the presedence is correct the entry will require ok.js,
// if not it will try to require fail.js and fail.
require("./" + TEST + ".js");
