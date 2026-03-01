import asset from "./unused.png?asset";
import bytes from "./unused.png?bytes";
import inlined from "./unused.png?inline";
import source from "./unused.png?source";
import resource from "./used.png";

let arr = [asset, bytes, inlined, source];
let obj = { asset, bytes, inlined, source };

export { arr, obj, resource };
