export default 42;
---
import { test as value1 } from "./module";
import { test as value2 } from "external";
export default `${value1} ${value2}`;
