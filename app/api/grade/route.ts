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

// Use openai to get the two letter state abbreviation from the state input
async function getStateAbbreviation(state: string) {
  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Print the two letter state abbreviation for '${state}'.`,
      },
    ],
    max_tokens: 50,
  });

  const res = oaiRes.data.choices[0].message?.content.trim() || "";

  return res;
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
    if (!r.state) {
      return new Response("Missing state", { status: 400 });
    }

    stateAbbreviation = await getStateAbbreviation(r.state);
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
    } else if (number === PRESIDENT_QUESTION) {
      context = `Current President: ${await getPresidentFromWikipedia()}`;
    } else if (number === VICE_PRESIDENT_QUESTION) {
      context = `Current Vice President: ${await getVicePresidentFromWikipedia()}`;
    } else if (number === SPEAKER_OF_THE_HOUSE) {
      context = `Current Speaker of the House: ${await getSpeakerOfTheHouseFromWikipedia()}`;
    } else if (number === CHIEF_JUSTICE_QUESTION) {
      context = `Current Chief Justice: John Roberts ${await getChiefJusticeFromWikipedia()}`;
    } else if (number === POLITICAL_PARTY_QUESTION) {
      context = `Current Political Party: ${getPoliticalPartyOfPresidentFromWikipedia()}`;
    }
  }

  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Grade the answer to this question on the US citizenship test.

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
},`,
      },
    ],
    max_tokens: 1500,
  });

  const res = oaiRes.data.choices[0].message?.content.trim() || "";

  return new Response(res);
}
