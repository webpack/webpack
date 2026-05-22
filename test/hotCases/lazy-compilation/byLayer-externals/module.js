import { existsSync } from "fs";
import { join } from "path";

export const isFile = existsSync;
export const joinedPath = join("a", "b");
