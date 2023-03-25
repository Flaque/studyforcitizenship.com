import {
  CHIEF_JUSTICE_QUESTION,
  POLITICAL_PARTY_QUESTION,
  PRESIDENT_QUESTION,
  QUESTIONS_REQUIRING_STATE,
  SPEAKER_OF_THE_HOUSE,
  VICE_PRESIDENT_QUESTION,
  YOUR_STATE_CAPITAL_QUESTION,
  YOUR_STATE_GOV_QUESTION,
  YOUR_STATE_SENATORS_QUESTION,
  YOUR_US_REPRESENTATIVE_QUESTION,
} from "@/app/constants";
import { OpenAIApi, Configuration } from "openai";
import {
  getSenateRepresentatives,
  getHouseRepresentatives,
  getStateData,
  getSpeakerOfTheHouseFromWikipedia,
  getChiefJusticeFromWikipedia,
  getPresidentFromWikipedia,
  getVicePresidentFromWikipedia,
  getPoliticalPartyOfPresidentFromWikipedia,
} from "./specifics";
import { load } from "cheerio";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const openai = new OpenAIApi(config);

export async function parseStateFromAnswer(answer: string) {
  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Find the US State mentioned in the text. If there's no state, return 'None'. Print the state as a two state letter abbreviation, like 'ID'.\n\n${answer}`,
      },
    ],
    max_tokens: 50,
  });

  return oaiRes.data.choices[0].message?.content.trim() || "";
}

export async function translateStateError(lang: string) {
  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Print the phrase "You must include the state you live in! For example: 'I live in Idaho, and my senator is ...'" in this language: ${lang}.`,
      },
    ],
    max_tokens: 50,
  });

  return oaiRes.data.choices[0].message?.content.trim() || "";
}

export async function POST(request: Request) {
  const r = await request.json();
  const { question, answer, language, number } = r;

  if (!question || !answer || !language || !number) {
    return new Response("Missing question or answer", { status: 400 });
  }

  // Questions that require the state.
  let context = "";
  let state = "";
  let stateAbbreviation;
  if (QUESTIONS_REQUIRING_STATE.includes(number)) {
    const stateAbbreviation = await parseStateFromAnswer(answer);

    if (stateAbbreviation === "None") {
      return new Response(`{
"grade": "Incorrect",
"explanation": "${await (
        await translateStateError(language)
      ).replaceAll('"', "'")}"
      }`);
    }

    state = `State: ${stateAbbreviation}`;

    const stateData = await getStateData(stateAbbreviation!);
    if (!stateData) {
      return new Response("Invalid State", { status: 400 });
    }

    // Specific questions with answers we should look up
    if (number === YOUR_STATE_SENATORS_QUESTION) {
      const senators = await getSenateRepresentatives(stateAbbreviation!);
      context = `${stateAbbreviation} Senators: ${senators
        .map((s: any) => s.name)
        .join(", ")}`;
    } else if (number == YOUR_STATE_GOV_QUESTION) {
      context = `${stateAbbreviation} Governor: ${stateData.governor}`;
    } else if (number == YOUR_STATE_CAPITAL_QUESTION) {
      context = `${stateAbbreviation} Capital: ${stateData.capital}`;
    } else if (number == YOUR_US_REPRESENTATIVE_QUESTION) {
      const houseReps = await getHouseRepresentatives(stateAbbreviation!);
      context = `${stateAbbreviation} Representatives: ${houseReps
        .map((s: any) => s.name)
        .join(", ")}`;
    }
  }

  if (number === PRESIDENT_QUESTION) {
    context = `Current President: ${await getPresidentFromWikipedia()}`;
  } else if (number === VICE_PRESIDENT_QUESTION) {
    context = `Current Vice President: ${await getVicePresidentFromWikipedia()}`;
  } else if (number === SPEAKER_OF_THE_HOUSE) {
    console.log("I'm GIVEN CONTEXT");
    context = `Current Speaker of the House: ${await getSpeakerOfTheHouseFromWikipedia()}`;
  } else if (number === CHIEF_JUSTICE_QUESTION) {
    context = `Current Chief Justice: John Roberts ${await getChiefJusticeFromWikipedia()}`;
  } else if (number === POLITICAL_PARTY_QUESTION) {
    context = `Current Political Party: ${getPoliticalPartyOfPresidentFromWikipedia()}`;
  }

  console.log(`Grade the answer to this question on the US citizenship test.

  Available grades:
  - Incorrect
  - Correct
  
  ${state}${context}
  ISO Language: ${language}
  Question: ${question}
  Answer: "${answer}"
  
  Respond in the following JSON format:
  interface Response {
    grade: "Incorrect" | "Correct";
  
    // The explanation (and correct answer) is in ${language}.
    explanation: string;
  },`);

  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Grade the answer to this question on the US citizenship test.

Available grades:
- Incorrect
- Correct

# Context
Todays Date: ${new Date().toLocaleDateString()}
ISO Language: ${language}
${state}${context}

# Test
Question: ${question}
User's Answer: "${answer}"

Respond in the following JSON format:
interface Response {
  grade: "Incorrect" | "Correct";

  // The explanation (and correct answer) is in ${language}.
  explanation: string;
},`,
      },
    ],
    max_tokens: 1500,
  });

  const res = oaiRes.data.choices[0].message?.content.trim() || "";

  return new Response(res);
}
