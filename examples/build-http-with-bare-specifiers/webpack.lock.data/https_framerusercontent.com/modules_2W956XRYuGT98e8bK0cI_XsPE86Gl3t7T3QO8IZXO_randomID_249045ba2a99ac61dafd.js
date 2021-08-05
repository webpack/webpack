import { useConstant } from "https://framerusercontent.com/modules/ExNgrA7EJTKUPpH6vIlN/UhvmooT4YAD6mU3raeSS/useConstant.js";
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export function randomID(length = 5) {
    return Array(length).fill(0).map(()=>BASE62[Math.floor(Math.random() * BASE62.length)]
    ).join("");
}
export function useRandomID(length = 5) {
    return useConstant(()=>randomID(length)
    );
}
// RandomID but caches in localstorage
const defaultStorageKey = "$$FramerRandomID";
let safeLocalStorage = undefined;
try {
    if (typeof window !== undefined) {
        safeLocalStorage = window.localStorage;
    }
} catch (e) {
// happy linting!
}
export function useCachedRandomID(storageKey = defaultStorageKey) {
    return useConstant(()=>{
        if (safeLocalStorage) {
            const cache = localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey)) : null;
            if (cache) return cache;
            const newID = randomID(8);
            localStorage.setItem(storageKey, JSON.stringify(newID));
            return newID;
        } else {
            return randomID(8);
        }
    });
}

export const __FramerMetadata__ = {"exports":{"useCachedRandomID":{"type":"function","annotations":{"framerContractVersion":"1"}},"randomID":{"type":"function","annotations":{"framerContractVersion":"1"}},"useRandomID":{"type":"function","annotations":{"framerContractVersion":"1"}}}}