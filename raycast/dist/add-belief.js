"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddBelief;
const react_1 = __importStar(require("react"));
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
const api_2 = require("./lib/api");
function AddBelief() {
    const [belief, setBelief] = (0, react_1.useState)("");
    const [betId, setBetId] = (0, react_1.useState)("");
    const { data: bets, isLoading } = (0, utils_1.usePromise)(async () => {
        return (0, api_2.apiFetch)("/api/practice/bets");
    }, []);
    async function handleSubmit() {
        if (!belief.trim()) {
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Failure, title: "Belief text is required" });
            return;
        }
        const payload = {
            belief: belief.trim(),
            status: "untested",
            bet_id: betId || undefined,
        };
        try {
            await (0, api_2.apiFetch)("/api/practice/beliefs", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setBelief("");
            setBetId("");
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Success, title: "Belief added" });
        }
        catch (error) {
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Failure, title: "Failed to add belief", message: String(error) });
        }
    }
    return (react_1.default.createElement(api_1.Form, { actions: react_1.default.createElement(api_1.ActionPanel, null,
            react_1.default.createElement(api_1.Action, { title: "Add Belief", onAction: handleSubmit })) },
        react_1.default.createElement(api_1.Form.TextArea, { id: "belief", title: "Belief", placeholder: "Describe the belief", value: belief, onChange: setBelief }),
        react_1.default.createElement(api_1.Form.Dropdown, { id: "bet", title: "Bet", value: betId, isLoading: isLoading, onChange: setBetId },
            react_1.default.createElement(api_1.Form.Dropdown.Item, { value: "", title: "Unlinked belief" }), bets === null || bets === void 0 ? void 0 :
            bets.map((bet) => (react_1.default.createElement(api_1.Form.Dropdown.Item, { key: bet.id, value: bet.id, title: bet.name }))))));
}
