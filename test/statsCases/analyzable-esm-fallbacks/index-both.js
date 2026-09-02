// Static here and dynamic from the other entry, so the split chunk holding the module
// is both initial and loaded through the public path.
import { url } from "./both";

export { url };
