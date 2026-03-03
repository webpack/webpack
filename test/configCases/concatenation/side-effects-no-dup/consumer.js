import { sideEffectValue } from "./side-effect";

export function consume() {
    return "consumed:" + sideEffectValue;
}
