import { foo } from "foo";
import "bar";
import { foo2 as two } from "foo";
import def, { used } from "lib";
import * as all from "all";
import { kept } from "kept";
console.log(used, kept);
export { foo, two as foo2, def, all as namespace };
export { kept };
