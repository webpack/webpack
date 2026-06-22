import { value } from "./shared";

export default value;
---
const p = import(/* webpackChunkName: "lazy" */ "./shared");

export default p;
