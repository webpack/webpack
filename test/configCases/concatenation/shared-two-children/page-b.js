import { sharedValue, sharedHelper } from "./shared";

export function pageB() {
    return "page-b:" + sharedValue + ":" + sharedHelper();
}
