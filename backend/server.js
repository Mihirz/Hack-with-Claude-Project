import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("WARNING: OPENROUTER_API_KEY is not set in .env");
}

app.use(cors({ origin: true })); // you can restrict to your frontend origin later
app.use(express.json());

// --- Helper: call OpenRouter ---
async function estimateWithOpenRouter(description) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const body = {
    model: "openai/gpt-4o", // or another OpenRouter model you prefer
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are a carbon footprint estimator for a personal "carbon calorie" tracker.
The user will describe ONE activity in natural language (e.g. "Took an Uber 4km to campus" or "ate a beef burger").

You MUST return a single JSON object with this exact shape:

{
  "category": "transport" | "food" | "home" | "shopping" | "other",
  "carbon_grams": number,
  "carbon_calories": number,
  "assumptions": string,
  "explanation": string
}

Definitions:
- ` + "`carbon_grams`" + ` is your best estimate of the lifecycle CO₂e emissions, in grams, for this single activity.
- ` + "`carbon_calories`" + ` is a user-facing scoring unit. For now, set it equal to carbon_grams (1 cc = 1 g CO₂e).
- ` + "`assumptions`" + ` summarize any assumed distance, duration, or emission factors.
- ` + "`explanation`" + ` is a short, human-friendly explanation of how you got the estimate.

Be conservative and choose simple default assumptions if the user is vague.
If the activity is clearly low-impact (e.g. walking, biking), use a small positive number (e.g. 10–50 g) and explain why.
Never ask the user questions. Just estimate from what you have.
        `.trim()
      },
      {
        role: "user",
        content: description
      }
    ]
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // optional attribution headers:
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "",
      "X-Title": process.env.OPENROUTER_APP_NAME || "CarbonCal"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content from OpenRouter");
  }

  // When using response_format: json_object, content should be JSON already,
  // but we guard by trying to parse it if it's a string.
  let parsed;
  if (typeof content === "string") {
    parsed = JSON.parse(content);
  } else if (Array.isArray(content)) {
    // Some models return an array of content blocks
    const textPart = content.find(p => p.type === "text")?.text ?? "";
    parsed = JSON.parse(textPart || "{}");
  } else {
    parsed = content;
  }

  if (
    typeof parsed.carbon_grams !== "number" ||
    typeof parsed.carbon_calories !== "number" ||
    typeof parsed.category !== "string"
  ) {
    throw new Error("Malformed structured response from model");
  }

  return parsed;
}

// --- API route: POST /api/estimate ---
app.post("/api/estimate", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'description'" });
    }

    const estimate = await estimateWithOpenRouter(description);

    // Optionally clamp / sanity-check values
    const safeEstimate = {
      category: estimate.category,
      carbon_grams: Math.max(0, Math.round(estimate.carbon_grams)),
      carbon_calories: Math.max(0, Math.round(estimate.carbon_calories)),
      assumptions: estimate.assumptions,
      explanation: estimate.explanation
    };

    return res.json(safeEstimate);
  } catch (err) {
    console.error("Error in /api/estimate:", err);
    return res.status(500).json({
      error: "Failed to estimate carbon footprint.",
      details: process.env.NODE_ENV === "development" ? String(err) : undefined
    });
  }
});

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CarbonCal backend running" });
});

app.listen(PORT, () => {
  console.log(`CarbonCal backend listening on http://localhost:${PORT}`);
});
