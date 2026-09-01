// zebra is imported first, so its rules cascade before alpha's
import "./zebra.css";
import { shared } from "./shared.js";

export const render = () => `<div class="zebra alpha">${shared}</div>`;
