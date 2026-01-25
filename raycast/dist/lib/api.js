"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiFetch = apiFetch;
const api_1 = require("@raycast/api");
function getPreferences() {
    return (0, api_1.getPreferenceValues)();
}
async function apiFetch(path, init) {
    const { apiUrl, apiToken, vercelBypassToken } = getPreferences();
    const headers = {
        "Content-Type": "application/json",
        ...init === null || init === void 0 ? void 0 : init.headers,
    };
    if (apiToken) {
        headers.Authorization = `Bearer ${apiToken}`;
    }
    if (vercelBypassToken) {
        headers["x-vercel-protection-bypass"] = vercelBypassToken;
    }
    const url = new URL(`${apiUrl}${path}`);
    if (vercelBypassToken) {
        url.searchParams.set("x-vercel-set-bypass-cookie", "true");
        url.searchParams.set("x-vercel-protection-bypass", vercelBypassToken);
    }
    const res = await fetch(url.toString(), {
        ...init,
        headers,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
    }
    return res.json();
}
