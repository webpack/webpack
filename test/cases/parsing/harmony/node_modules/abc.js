export var a = "a";
export var b = "b";
export {c} from "./abc_c";

import * as temp from "./abc_c";
export {temp as d};

import {c} from "./abc_c";
export {c as e};
