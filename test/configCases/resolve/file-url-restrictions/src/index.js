"use strict";

require(OUTSIDE_URL);
// an encoded `/` cannot be a path, so it fails as a module error
require("file:///tmp/a%2Fb.js");
