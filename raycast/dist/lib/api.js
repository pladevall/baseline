"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiFetch = apiFetch;
const api_1 = require("@raycast/api");
function getPreferences() {
    return (0, api_1.getPreferenceValues)();
}
async function apiFetch(path, init) {
    const { apiUrl, apiToken } = getPreferences();
    const headers = {
        "Content-Type": "application/json",
        ...init === null || init === void 0 ? void 0 : init.headers,
    };
    if (apiToken) {
        headers.Authorization = `Bearer ${apiToken}`;
    }
    const res = await fetch(`${apiUrl}${path}`, {
        ...init,
        headers,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
    }
    return res.json();
}
