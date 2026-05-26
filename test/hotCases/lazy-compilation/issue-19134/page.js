// Simulates a "page" module in a micro-frontend that pulls in multiple
// externally provided libraries (in the real issue, React and Ant Design).
import { existsSync } from "fs";
import { join } from "path";

export const isFile = existsSync;
export const joinedPath = join("a", "b");
