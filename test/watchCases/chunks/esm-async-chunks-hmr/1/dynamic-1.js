export var value = "1";

function doNothing() {}

import("./dynamic-2").then(doNothing)
