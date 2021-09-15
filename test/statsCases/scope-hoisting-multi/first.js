import v from "./vendor";
import c from "./common";
import x from "./module_first";

import(/* webpackChunkName: "lazy_first" */ "./lazy_first");
import(/* webpackChunkName: "lazy_shared" */ "./lazy_shared");

export default v + c + x;
