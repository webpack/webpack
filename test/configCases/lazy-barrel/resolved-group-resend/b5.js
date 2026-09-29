// requests again after `local` activated the ordinary import
import { local, third } from "./lib/barrel.js";

export const useThird = () => third + local();
