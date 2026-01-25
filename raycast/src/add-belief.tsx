import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { apiFetch } from "./lib/api";
import type { Bet } from "./lib/types";

type CreateBeliefPayload = {
  belief: string;
  status: "untested";
  bet_id?: string | null;
};

export default function AddBelief() {
  const [belief, setBelief] = useState("");
  const [betId, setBetId] = useState<string>("");

  const { data: bets, isLoading } = usePromise(async () => {
    return apiFetch<Bet[]>("/api/practice/bets");
  }, []);

  async function handleSubmit() {
    if (!belief.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Belief text is required" });
      return;
    }

    const payload: CreateBeliefPayload = {
      belief: belief.trim(),
      status: "untested",
      bet_id: betId || undefined,
    };

    try {
      await apiFetch("/api/practice/beliefs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setBelief("");
      setBetId("");
      await showToast({ style: Toast.Style.Success, title: "Belief added" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add belief", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add Belief" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="belief"
        title="Belief"
        placeholder="Describe the belief"
        value={belief}
        onChange={setBelief}
      />
      <Form.Dropdown
        id="bet"
        title="Bet"
        value={betId}
        isLoading={isLoading}
        onChange={setBetId}
      >
        <Form.Dropdown.Item value="" title="Unlinked belief" />
        {bets?.map((bet) => (
          <Form.Dropdown.Item key={bet.id} value={bet.id} title={bet.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
