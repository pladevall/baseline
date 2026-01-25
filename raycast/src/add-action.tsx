import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { apiFetch } from "./lib/api";
import type { Bet, Belief } from "./lib/types";

type CreateActionPayload = {
  description: string;
  belief_id?: string | null;
  bet_id?: string | null;
};

export default function AddAction() {
  const [description, setDescription] = useState("");
  const [beliefId, setBeliefId] = useState<string>("");
  const [betId, setBetId] = useState<string>("");

  const { data: beliefs, isLoading: beliefsLoading } = usePromise(async () => {
    return apiFetch<Belief[]>("/api/practice/beliefs");
  }, []);

  const { data: bets, isLoading: betsLoading } = usePromise(async () => {
    return apiFetch<Bet[]>("/api/practice/bets");
  }, []);

  const selectedBelief = useMemo(
    () => beliefs?.find((belief) => belief.id === beliefId),
    [beliefs, beliefId]
  );

  const canEditBet = !selectedBelief;

  async function handleSubmit() {
    if (!description.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Description is required" });
      return;
    }

    const payload: CreateActionPayload = {
      description: description.trim(),
      belief_id: selectedBelief?.id || undefined,
      bet_id: selectedBelief?.bet_id ?? (betId || undefined),
    };

    try {
      await apiFetch("/api/practice/bold-takes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDescription("");
      setBeliefId("");
      setBetId("");
      await showToast({ style: Toast.Style.Success, title: "Action added" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add action", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add Action" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Action"
        placeholder="Describe the action"
        value={description}
        onChange={setDescription}
      />
      <Form.Dropdown
        id="belief"
        title="Belief"
        value={beliefId}
        isLoading={beliefsLoading}
        onChange={setBeliefId}
      >
        <Form.Dropdown.Item value="" title="Unlinked action" />
        {beliefs?.map((belief) => {
          const betName = bets?.find((bet) => bet.id === belief.bet_id)?.name;
          return (
            <Form.Dropdown.Item
              key={belief.id}
              value={belief.id}
              title={`${belief.belief}${betName ? ` — ${betName}` : ""}`}
            />
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown
        id="bet"
        title="Bet"
        value={selectedBelief?.bet_id ?? betId}
        isLoading={betsLoading}
        onChange={setBetId}
        isDisabled={!canEditBet}
      >
        <Form.Dropdown.Item value="" title="No bet" />
        {bets?.map((bet) => (
          <Form.Dropdown.Item key={bet.id} value={bet.id} title={bet.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
