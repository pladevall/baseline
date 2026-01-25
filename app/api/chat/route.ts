import { NextResponse } from "next/server";
import { getEntriesFromDb, getGoals } from "@/lib/supabase";
import {
  getPracticeGoals,
  getBoldTakes,
  getBeliefs,
  getPracticeHistory,
  getStreak,
  getTodayPractice,
} from "@/lib/practice/supabase-practice";
import { buildContext } from "@/lib/practice/ai";
import type { ChatMessage } from "@/lib/practice/types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

function getApiKey(): string | null {
  return process.env.GOOGLE_GEMINI_API_KEY || null;
}

function getModels(): string[] {
  const raw = process.env.GEMINI_MODELS;
  if (!raw) return DEFAULT_MODELS;
  return raw
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function buildBaselineContext(entries: Awaited<ReturnType<typeof getEntriesFromDb>>, goals: Awaited<ReturnType<typeof getGoals>>): string {
  const parts: string[] = [];
  const latest = entries[0];
  const previous = entries[1];

  if (latest) {
    parts.push("LATEST BIA ENTRY:");
    parts.push(`- Date: ${latest.date}`);
    parts.push(`- Weight: ${latest.weight} lb`);
    parts.push(`- Body Fat %: ${latest.bodyFatPercentage}%`);
    parts.push(`- Skeletal Muscle: ${latest.skeletalMuscle} lb`);
    parts.push(`- Visceral Fat: ${latest.visceralFat}`);
    parts.push(`- Fitness Score: ${latest.fitnessScore}`);
    if (previous) {
      parts.push("RECENT CHANGE:");
      parts.push(`- Weight change: ${(latest.weight - previous.weight).toFixed(1)} lb`);
      parts.push(`- Body Fat change: ${(latest.bodyFatPercentage - previous.bodyFatPercentage).toFixed(1)}%`);
    }
    parts.push("");
  }

  if (goals.length > 0) {
    parts.push("GOALS:");
    for (const goal of goals) {
      parts.push(`- ${goal.metricKey}: ${goal.targetValue}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

async function chatWithAssistant(
  message: string,
  history: ChatMessage[],
  context: string,
  page: string,
  memory?: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "AI chat is unavailable. Please set GOOGLE_GEMINI_API_KEY.";
  }

  const models = getModels();

  const systemPrompt = `You are Baseline, a concise assistant. Use the provided context to answer questions.
If the user asks for changes, respond with specific, actionable guidance. Keep answers short and practical.

PAGE: ${page}
MEMORY: ${memory || "(none)"}
CONTEXT:\n${context}`;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  contents.push({ role: "user", parts: [{ text: `[System]\n${systemPrompt}` }] });
  contents.push({ role: "model", parts: [{ text: "Ready. What should we look at?" }] });

  for (const msg of history) {
    contents.push({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.content }] });
  }

  contents.push({ role: "user", parts: [{ text: message }] });

  let lastStatus: number | null = null;

  for (const model of models) {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
        return "No response from AI. Please try again.";
      }

      lastStatus = response.status;
      if (response.status === 401 || response.status === 403) {
        return `AI service error: ${response.status}. Please check your API key.`;
      }
    } catch (error) {
      console.error("AI chat error:", error);
    }
  }

  if (lastStatus) {
    return `AI service error: ${lastStatus}. Please check your API key or model availability.`;
  }
  return "AI error: Please try again.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [], page = "/", memory = "" } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (page.startsWith("/actions")) {
      const [goals, boldTakes, beliefs, practiceHistory, streak, todayPractice] = await Promise.all([
        getPracticeGoals(),
        getBoldTakes(10),
        getBeliefs(),
        getPracticeHistory(7),
        getStreak(),
        getTodayPractice(),
      ]);

      const context = buildContext(goals, boldTakes, beliefs, practiceHistory, streak, todayPractice);
      const response = await chatWithAssistant(message, history, context, page, memory);
      return NextResponse.json({ response });
    }

    if (page.startsWith("/calendar")) {
      const context = "CALENDAR VIEW: No server-side calendar data loaded. Ask about events visible on screen.";
      const response = await chatWithAssistant(message, history, context, page, memory);
      return NextResponse.json({ response });
    }

    const [entries, goals] = await Promise.all([getEntriesFromDb(), getGoals()]);
    const context = buildBaselineContext(entries, goals);
    const response = await chatWithAssistant(message, history, context, page, memory);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error in AI chat:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
