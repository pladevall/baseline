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
exports.default = AddAction;
const react_1 = __importStar(require("react"));
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
const api_2 = require("./lib/api");
function AddAction() {
    var _a;
    const [description, setDescription] = (0, react_1.useState)("");
    const [beliefId, setBeliefId] = (0, react_1.useState)("");
    const [betId, setBetId] = (0, react_1.useState)("");
    const { data: beliefs, isLoading: beliefsLoading } = (0, utils_1.usePromise)(async () => {
        return (0, api_2.apiFetch)("/api/practice/beliefs");
    }, []);
    const { data: bets, isLoading: betsLoading } = (0, utils_1.usePromise)(async () => {
        return (0, api_2.apiFetch)("/api/practice/bets");
    }, []);
    const selectedBelief = (0, react_1.useMemo)(() => beliefs === null || beliefs === void 0 ? void 0 : beliefs.find((belief) => belief.id === beliefId), [beliefs, beliefId]);
    const canEditBet = !selectedBelief;
    async function handleSubmit() {
        var _a;
        if (!description.trim()) {
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Failure, title: "Description is required" });
            return;
        }
        const payload = {
            description: description.trim(),
            belief_id: (selectedBelief === null || selectedBelief === void 0 ? void 0 : selectedBelief.id) || undefined,
            bet_id: (_a = selectedBelief === null || selectedBelief === void 0 ? void 0 : selectedBelief.bet_id) !== null && _a !== void 0 ? _a : (betId || undefined),
        };
        try {
            await (0, api_2.apiFetch)("/api/practice/bold-takes", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setDescription("");
            setBeliefId("");
            setBetId("");
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Success, title: "Action added" });
        }
        catch (error) {
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Failure, title: "Failed to add action", message: String(error) });
        }
    }
    return (react_1.default.createElement(api_1.Form, { actions: react_1.default.createElement(api_1.ActionPanel, null,
            react_1.default.createElement(api_1.Action, { title: "Add Action", onAction: handleSubmit })) },
        react_1.default.createElement(api_1.Form.TextArea, { id: "description", title: "Action", placeholder: "Describe the action", value: description, onChange: setDescription }),
        react_1.default.createElement(api_1.Form.Dropdown, { id: "belief", title: "Belief", value: beliefId, isLoading: beliefsLoading, onChange: setBeliefId },
            react_1.default.createElement(api_1.Form.Dropdown.Item, { value: "", title: "Unlinked action" }), beliefs === null || beliefs === void 0 ? void 0 :
            beliefs.map((belief) => {
                var _a;
                const betName = (_a = bets === null || bets === void 0 ? void 0 : bets.find((bet) => bet.id === belief.bet_id)) === null || _a === void 0 ? void 0 : _a.name;
                return (react_1.default.createElement(api_1.Form.Dropdown.Item, { key: belief.id, value: belief.id, title: `${belief.belief}${betName ? ` — ${betName}` : ""}` }));
            })),
        react_1.default.createElement(api_1.Form.Dropdown, { id: "bet", title: "Bet", value: (_a = selectedBelief === null || selectedBelief === void 0 ? void 0 : selectedBelief.bet_id) !== null && _a !== void 0 ? _a : betId, isLoading: betsLoading, onChange: (next) => {
                if (!canEditBet)
                    return;
                setBetId(next);
            } },
            react_1.default.createElement(api_1.Form.Dropdown.Item, { value: "", title: "No bet" }), bets === null || bets === void 0 ? void 0 :
            bets.map((bet) => (react_1.default.createElement(api_1.Form.Dropdown.Item, { key: bet.id, value: bet.id, title: bet.name }))))));
}
