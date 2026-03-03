import { sharedValue, sharedHelper } from "./shared";

export function pageA() {
    return sharedValue + ":" + sharedHelper();
}
