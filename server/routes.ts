import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { conditionsData } from "@shared/conditions";
import { z } from "zod";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

const JWT_SECRET = process.env.SESSION_SECRET || "super_secret_key";
const openAiApiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const geminiModel = (process.env.GEMINI_MODEL || "gemini-2.0-flash").replace(
  /^models\//,
  "",
);

const openai = openAiApiKey
  ? new OpenAI({
      apiKey: openAiApiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    })
  : null;

function logAiConfiguration() {
  const hasOpenAi = Boolean(openAiApiKey);
  const hasGemini = Boolean(geminiApiKey);
  const openAiBaseUrl =
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

  console.info(
    `[ai] OPENAI configured: ${hasOpenAi} | model: ${openAiModel} | baseURL: ${openAiBaseUrl}`,
  );
  console.info(
    `[ai] GEMINI configured: ${hasGemini} | model: ${geminiModel}`,
  );
  if (!hasOpenAi && !hasGemini) {
    console.warn(
      "[ai] No AI provider key is configured. Chat will run in local fallback mode only.",
    );
  }
}

logAiConfiguration();

type ParsedAiResponse = {
  reply?: string;
  condition?: string | null;
  followUpQuestions?: string[];
};

type ConditionRecord = (typeof conditionsData)[number];

type PendingAssessment = {
  conditionId: string;
  answers: string[];
};

const pendingAssessments = new Map<number, PendingAssessment>();
const stopWords = new Set([
  "i",
  "am",
  "is",
  "are",
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "with",
  "for",
  "my",
  "have",
  "has",
  "had",
  "been",
  "from",
  "in",
  "on",
  "at",
  "it",
  "this",
  "that",
  "today",
  "since",
  "very",
  "really",
  "feeling",
  "feel",
]);

const firstAidByConditionId: Record<string, string[]> = {
  c1: [
    "Rest and drink warm fluids frequently.",
    "Use steam inhalation or saline nasal rinse for congestion.",
    "Monitor fever and breathing; seek care if symptoms worsen after a few days.",
  ],
  c2: [
    "Rest in a dark, quiet room and reduce screen/light exposure.",
    "Hydrate and avoid known triggers such as sleep loss or stress spikes.",
    "Get urgent care if severe headache is sudden, different, or with weakness/vision issues.",
  ],
  c3: [
    "Take frequent small sips of clean fluids to prevent dehydration.",
    "Eat bland, light food only after vomiting settles.",
    "Seek care quickly if unable to keep fluids down or signs of dehydration appear.",
  ],
  c4: [
    "Avoid lying down for 2-3 hours after meals.",
    "Choose smaller meals and avoid trigger foods that worsen burning.",
    "Go to emergency care if chest pain is severe or with shortness of breath/sweating.",
  ],
  c5: [
    "Reduce exposure to dust, pollen, and smoke.",
    "Use a mask outdoors and wash face/hair after exposure.",
    "Keep indoor air clean and monitor for breathing difficulty.",
  ],
  c6: [
    "Rest in a calm space and reduce stress inputs.",
    "Apply a warm compress to neck/scalp and maintain hydration.",
    "Adjust posture and take regular screen breaks.",
  ],
  c7: [
    "Avoid known triggers such as dust, pollen, strong perfumes, and smoke.",
    "Use saline rinse and keep rooms well ventilated and dust controlled.",
    "Track symptom pattern and seek specialist care if persistent.",
  ],
  c8: [
    "Use steam inhalation and warm compress on face/sinus area.",
    "Hydrate well and keep nasal passages moist.",
    "Get care for persistent high fever, facial swelling, or severe pain.",
  ],
  c9: [
    "Cool the area with clean running water for at least 20 minutes.",
    "Remove tight items near the burn and protect with a clean, non-stick dressing.",
    "Do not apply ice, toothpaste, or oils; seek urgent care for deep/large burns.",
  ],
  c10: [
    "Increase water intake and do not delay urination.",
    "Maintain genital hygiene and avoid irritants.",
    "Seek care promptly if fever, flank pain, or blood in urine appears.",
  ],
  c11: [
    "Follow RICE: rest, ice, compression, elevation.",
    "Avoid heavy activity until pain and swelling reduce.",
    "Seek care if severe swelling, deformity, or inability to bear weight.",
  ],
  c12: [
    "Prioritize rest and avoid overexertion.",
    "Maintain a balanced diet and hydration.",
    "Seek medical evaluation for persistent fatigue, dizziness, or chest discomfort.",
  ],
  c13: [
    "Move to fresh air and sit upright with slow breathing.",
    "Avoid smoke, dust, and known environmental triggers.",
    "Get emergency help if speaking becomes difficult or lips turn blue.",
  ],
  c14: [
    "Hydrate with frequent small sips of safe fluids.",
    "Rest and start bland foods only after symptoms ease.",
    "Seek urgent care for high fever, blood in stool/vomit, or dehydration signs.",
  ],
  c15: [
    "Moisturize skin regularly and avoid harsh soaps/fragrances.",
    "Keep nails short to reduce skin injury from scratching.",
    "Watch for infection signs such as pus, spreading redness, or fever.",
  ],
  c16: [
    "Keep a regular sleep schedule and avoid prolonged cold exposure.",
    "Maintain a balanced routine with gentle physical activity.",
    "Follow up with endocrine evaluation if fatigue and weight changes persist.",
  ],
  c17: [
    "Maintain fixed sleep and wake times daily.",
    "Avoid heavy screen use and stimulants close to bedtime.",
    "Use a dark, quiet, cool room and relaxation breathing before sleep.",
  ],
  c18: [
    "Isolate to reduce spread until all blisters crust over.",
    "Keep skin clean, wear loose clothing, and avoid scratching lesions.",
    "Stay hydrated and seek urgent care for breathing trouble, confusion, or persistent high fever.",
  ],
  c19: [
    "Rehydrate early with frequent small fluid intake.",
    "Rest in a cool area and avoid heat exertion.",
    "Seek urgent care for confusion, fainting, or inability to keep fluids down.",
  ],
  c20: [
    "Sit or lie down immediately during spinning episodes to avoid falls.",
    "Move slowly and avoid sudden head turns.",
    "Seek urgent care for severe headache, weakness, speech changes, or persistent vomiting.",
  ],
};

function isGreetingMessage(message: string): boolean {
  const normalized = message.toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const greetingInputs = new Set([
    "hi",
    "hello",
    "hey",
    "hii",
    "hello medibot",
    "hi medibot",
    "hey medibot",
  ]);
  return greetingInputs.has(normalized);
}

function coerceJsonResponse(text: string): ParsedAiResponse {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as ParsedAiResponse;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as ParsedAiResponse;
    }
    throw new Error("AI response was not valid JSON.");
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

function countUniqueHits(haystack: Set<string>, needles: Set<string>): number {
  let hits = 0;
  for (const n of needles) {
    if (haystack.has(n)) hits += 1;
  }
  return hits;
}

function findBestConditionMatch(message: string): ConditionRecord | null {
  const text = message.toLowerCase();
  const messageTokens = new Set(tokenize(message));
  let bestMatch: ConditionRecord | null = null;
  let bestScore = -1;
  let bestExactPhrases = -1;
  let bestCoverage = -1;

  for (const condition of conditionsData) {
    const conditionName = condition.name.toLowerCase();
    let exactPhraseMatches = 0;
    const conditionKeywords = new Set<string>(tokenize(condition.name));
    let symptomKeywordsCount = 0;

    for (const symptom of condition.symptoms) {
      const s = symptom.toLowerCase();
      const symptomTokens = tokenize(symptom);
      for (const token of symptomTokens) {
        conditionKeywords.add(token);
      }
      symptomKeywordsCount += symptomTokens.length;

      if (text.includes(s)) {
        exactPhraseMatches += 1;
      }
    }

    const keywordHits = countUniqueHits(messageTokens, conditionKeywords);
    const coverage =
      symptomKeywordsCount > 0 ? keywordHits / symptomKeywordsCount : 0;
    const nameBoost = text.includes(conditionName) ? 4 : 0;
    const score = exactPhraseMatches * 8 + keywordHits + nameBoost;

    const isBetter =
      exactPhraseMatches > bestExactPhrases ||
      (exactPhraseMatches === bestExactPhrases && score > bestScore) ||
      (exactPhraseMatches === bestExactPhrases &&
        score === bestScore &&
        coverage > bestCoverage);

    if (isBetter) {
      bestExactPhrases = exactPhraseMatches;
      bestScore = score;
      bestCoverage = coverage;
      bestMatch = condition;
    }
  }

  const hasReasonableConfidence =
    bestExactPhrases >= 1 || bestScore >= 3 || bestCoverage >= 0.2;
  return hasReasonableConfidence ? bestMatch : null;
}

function assessSeverity(
  userMessage: string,
  followUpAnswers: string[],
): "Low" | "Medium" | "High" {
  const combined = `${userMessage} ${followUpAnswers.join(" ")}`.toLowerCase();
  const highRiskSignals = [
    "severe",
    "very high",
    "high fever",
    "blood",
    "chest pain",
    "shortness of breath",
    "unable",
    "can't",
    "cannot",
    "faint",
    "confusion",
    "blue",
  ];
  if (highRiskSignals.some((s) => combined.includes(s))) {
    return "High";
  }

  const mediumSignals = [
    "3 days",
    "4 days",
    "5 days",
    "6 days",
    "7 days",
    "persistent",
    "worse",
    "moderate",
    "frequent",
  ];
  if (mediumSignals.some((s) => combined.includes(s))) {
    return "Medium";
  }

  return "Low";
}

function buildConditionDetails(conditionData: ConditionRecord) {
  return {
    condition: conditionData.name,
    specialist: conditionData.specialistType,
    hospitalRecommendation: {
      doctorName: conditionData.doctor.name,
      specialization: conditionData.doctor.specialization,
      hospital: conditionData.doctor.hospital,
      location: conditionData.doctor.city,
      phone: conditionData.doctor.phone,
    },
    youtubeRemedy: conditionData.youtubeRemedy,
    arVideo: conditionData.arVideo,
    firstAidPlan: firstAidByConditionId[conditionData.id] || [
      "Rest and monitor symptoms closely.",
      "Hydrate and avoid triggers that worsen your symptoms.",
      "Seek in-person medical care if warning signs appear.",
    ],
  };
}

function generateLocalFallback(message: string): ParsedAiResponse {
  const text = message.toLowerCase();
  if (isGreetingMessage(message)) {
    return {
      reply:
        "Hi, I'm MEDIBOT, your medical assistant. Tell me what you're feeling, and I'll try to match your symptoms to one of the conditions I know about.",
      condition: null,
      followUpQuestions: [],
    };
  }

  let bestMatch: (typeof conditionsData)[number] | null = null;
  let bestScore = 0;

  for (const condition of conditionsData) {
    const symptoms = condition.symptoms.map((s) => s.toLowerCase());
    let score = 0;
    for (const symptom of symptoms) {
      if (text.includes(symptom)) {
        score += 2;
      } else {
        const symptomWords = symptom.split(/\s+/).filter((w) => w.length > 3);
        if (symptomWords.some((w) => text.includes(w))) {
          score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = condition;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return {
      reply:
        "I'm sorry, this condition is outside my supported dataset. Please consult a doctor for a proper diagnosis.",
      condition: null,
      followUpQuestions: [],
    };
  }

  const followUpQuestions = (bestMatch.followUpTriggers || []).slice(0, 2);
  if (bestScore < 3 && followUpQuestions.length > 0) {
    return {
      reply: `I need a bit more detail before confirming. Based on your symptoms, ${bestMatch.name} is one possibility.`,
      condition: null,
      followUpQuestions,
    };
  }

  return {
    reply: `Based on your symptoms, this may match ${bestMatch.name}. Please consult a medical professional to confirm.`,
    condition: bestMatch.name,
    followUpQuestions: [],
  };
}

async function generateWithGemini(
  systemPrompt: string,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<ParsedAiResponse> {
  if (!geminiApiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const conversationText = history
    .map((m) => `${m.role.toUpperCase()}: ${String(m.content ?? "")}`)
    .join("\n");

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nReturn only JSON.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  return coerceJsonResponse(raw);
}

// Mock Auth Middleware
interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== AUTH ROUTES ====================
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        name: input.name,
        email: input.email,
        passwordHash: input.password // In a real app, hash this with bcrypt
      });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      
      res.status(201).json({ user, token });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      
      const user = await storage.getUserByEmail(input.email);
      if (!user || user.passwordHash !== input.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      
      res.status(200).json({ user, token });
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.get(api.auth.me.path, authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== CHAT ROUTES ====================
  app.get(api.chats.list.path, authMiddleware, async (req: AuthRequest, res) => {
    try {
      const chats = await storage.getChats(req.user!.id);
      res.json(chats);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.chats.create.path, authMiddleware, async (req: AuthRequest, res) => {
    try {
      const input = api.chats.create.input.parse(req.body);
      const userId = req.user!.id;

      if (isGreetingMessage(input.message)) {
        const greetingReply =
          "Hi, I'm MEDIBOT, your medical assistant. Tell me what you're feeling, and I'll try to match your symptoms to one of the conditions I know about.";
        await storage.createChat({
          userId,
          role: "user",
          message: input.message,
        });
        await storage.createChat({
          userId,
          role: "assistant",
          message: greetingReply,
        });
        return res.json({
          reply: greetingReply,
          followUpQuestions: [],
        });
      }

      // 1. Save user message
      await storage.createChat({
        userId,
        role: "user",
        message: input.message,
      });
      const pending = pendingAssessments.get(userId);
      if (pending) {
        const matchedCondition = conditionsData.find((c) => c.id === pending.conditionId);
        if (!matchedCondition) {
          pendingAssessments.delete(userId);
        } else {
          pending.answers.push(input.message);
          const nextQuestionIndex = pending.answers.length;

          if (nextQuestionIndex < matchedCondition.followUpTriggers.length) {
            const nextQuestion = matchedCondition.followUpTriggers[nextQuestionIndex];
            const interimResponse = {
              reply: `Thanks. ${nextQuestion}`,
              followUpQuestions: [nextQuestion],
            };

            await storage.createChat({
              userId,
              role: "assistant",
              message: interimResponse.reply,
            });

            return res.json(interimResponse);
          }

          pendingAssessments.delete(userId);
          const severity = assessSeverity(input.message, pending.answers);
          const details = buildConditionDetails(matchedCondition);
          const finalResponse = {
            reply: `Based on your symptoms and follow-up answers, the most likely match in my supported dataset is ${matchedCondition.name}. Please consult a medical professional for confirmation.`,
            condition: details.condition,
            severity,
            specialist: details.specialist,
            hospitalRecommendation: details.hospitalRecommendation,
            youtubeRemedy: details.youtubeRemedy,
            arVideo: details.arVideo,
            firstAidPlan: details.firstAidPlan,
            followUpQuestions: [],
          };

          await storage.createChat({
            userId,
            role: "assistant",
            message: finalResponse.reply,
            condition: finalResponse.condition,
          });

          return res.json(finalResponse);
        }
      }

      const bestCondition = findBestConditionMatch(input.message);
      if (!bestCondition) {
        const parsedResponse = generateLocalFallback(input.message);
        await storage.createChat({
          userId,
          role: "assistant",
          message: parsedResponse.reply || "I encountered an error analyzing your symptoms.",
        });
        return res.json({
          reply: parsedResponse.reply || "I encountered an error analyzing your symptoms.",
          followUpQuestions: [],
        });
      }

      pendingAssessments.set(userId, {
        conditionId: bestCondition.id,
        answers: [],
      });

      const firstQuestion = bestCondition.followUpTriggers[0];
      const followUpResponse = {
        reply:
          `I need a bit more detail before confirming. Based on your symptoms, ${bestCondition.name} is one possibility.\nPlease answer these follow-up questions one by one (yes/no/details):\n1. ${bestCondition.followUpTriggers[0]}\n2. ${bestCondition.followUpTriggers[1]}\n3. ${bestCondition.followUpTriggers[2]}`,
        followUpQuestions: [firstQuestion],
      };

      await storage.createChat({
        userId,
        role: "assistant",
        message: followUpResponse.reply,
      });

      return res.json(followUpResponse);

    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error" });
      } else {
        res.status(500).json({ message: "Failed to process chat" });
      }
    }
  });

  return httpServer;
}
