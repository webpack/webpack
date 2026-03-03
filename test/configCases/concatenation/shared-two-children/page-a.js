import { sharedValue, sharedHelper } from "./shared";

export function pageA() {
    return "page-a:" + sharedValue + ":" + sharedHelper();
}
