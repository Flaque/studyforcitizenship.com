import {
  CHIEF_JUSTICE_QUESTION,
  INDIAN_QUESTION,
  POLITICAL_PARTY_QUESTION,
  PRESIDENT_QUESTION,
  QUESTIONS_REQUIRING_STATE,
  SECRETARY_OF_STATE_QUESTION,
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

function isParseableJSON(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

async function parseJSON(data: string) {
  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Print the JSON object in the text.",
      },
      {
        role: "user",
        content: data,
      },
    ],
    max_tokens: 1000,
  });

  return oaiRes.data.choices[0].message?.content.trim() || "";
}

export async function parseStateFromAnswer(
  answer: string,
): Promise<null | Record<string, string>> {
  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Find the US State mentioned in the text. If there's no state, return "None" without quote signs. Otherwise, return a JSON array of two strings: first, the state as a two state letter abbreviation like "ID", and second the full name of the state like "Idaho". For example, \`["ID", "Idaho"]\`\n\n${answer}`,
      },
    ],
    max_tokens: 50,
  });

  const foundContent = oaiRes.data.choices[0].message?.content.trim() || "";
  if (foundContent !== "None") {
    const [stateAbbreviation, stateName] = JSON.parse(foundContent);
    return { stateAbbreviation, stateName };
  }
  return null;
}

export async function translateError(err: string, lang: string) {
  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Print the error message "${err}" in the language: ${lang}.`,
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

function system(msg: string): { role: "system"; content: string } {
  return {
    role: "system",
    content: msg,
  };
}

function user(msg: string): { role: "user"; content: string } {
  return {
    role: "user",
    content: msg,
  };
}

export async function POST(request: Request) {
  const r = await request.json();
  const { question, answer, language, number } = r;

  if (!question || !answer || !language || !number) {
    return new Response("Missing question or answer", { status: 400 });
  }

  if (answer.length < 2) {
    return new Response(
      JSON.stringify({
        grade: "Incorrect",
        explanation: await translateError(
          "Your answer is too short.",
          language,
        ),
      }),
    );
  }

  const messages: Array<{ role: "user" | "system"; content: string }> = [
    {
      role: "system",
      content: `Grade the answer to this question on the US 
citizenship test.

Available grades:
- Incorrect
- Correct

Todays Date: ${new Date().toLocaleDateString()}
ISO Language: ${language}
`,
    },
  ];

  // Questions that require the state.

  if (QUESTIONS_REQUIRING_STATE.includes(number)) {
    const parsedState = await parseStateFromAnswer(answer);

    if (parsedState === null) {
      return new Response(`{
"grade": "Incorrect",
"explanation": "${(await translateStateError(language)).replaceAll('"', "'")}"
      }`);
    }

    const { stateAbbreviation, stateName } = parsedState;

    messages.push(system(`US State: ${stateAbbreviation}`));

    const stateData = await getStateData(stateName);
    if (!stateData) {
      return new Response("Invalid State", { status: 400 });
    }

    // Specific questions with answers we should look up
    if (number === YOUR_STATE_SENATORS_QUESTION) {
      const senators = await getSenateRepresentatives(stateAbbreviation!);
      let context = `${stateAbbreviation} Senators: ${senators
        .map((s: any) => s.name)
        .join(", ")}`;

      messages.push(system(context));
    } else if (number == YOUR_STATE_GOV_QUESTION) {
      messages.push(system(`State Governor: ${stateData.governor}`));
    } else if (number == YOUR_US_REPRESENTATIVE_QUESTION) {
      const houseReps = await getHouseRepresentatives(stateAbbreviation!);
      let context = `${stateAbbreviation} Representatives: ${houseReps
        .map((s: any) => s.name)
        .join(", ")}`;

      messages.push(system(context));
    }
  }

  if (number === PRESIDENT_QUESTION) {
    messages.push(
      system(`Current President: ${await getPresidentFromWikipedia()}`),
    );
  } else if (number === VICE_PRESIDENT_QUESTION) {
    messages.push(
      system(
        `Current Vice President: ${await getVicePresidentFromWikipedia()}`,
      ),
    );
  } else if (number === SPEAKER_OF_THE_HOUSE) {
    messages.push(
      system(
        `Current Speaker of the House: ${await getSpeakerOfTheHouseFromWikipedia()}`,
      ),
    );
  } else if (number === CHIEF_JUSTICE_QUESTION) {
    messages.push(
      system(`Current Chief Justice: ${await getChiefJusticeFromWikipedia()}`),
    );
  } else if (number === POLITICAL_PARTY_QUESTION) {
    messages.push(
      system(
        `Current Political Party: ${await getPoliticalPartyOfPresidentFromWikipedia()}`,
      ),
    );
  } else if (number === INDIAN_QUESTION) {
    messages.push(
      system(`If the user says ANY american indian tribe, they pass.`),
    );
  } else if (number === SECRETARY_OF_STATE_QUESTION) {
    messages.push(
      system(
        `The president's cabinet includes: Vice President, Secretary of State, Secretary of the Treasury, Secretary of Defense, Attorney General, Secretary of the Interior, Secretary of Agriculture, Secretary of Commerce, Secretary of Labor, Secretary of Health and Human Services, Secretary of Housing and Urban Development, Secretary of Transportation, Secretary of Energy, Secretary of Education, Secretary of Veterans Affairs, Secretary of Homeland Security. If the answer includes any two of these, it's correct.`,
      ),
    );
  }

  messages.push(system(`Q: '${question}'`));
  messages.push(user(`A: '${answer}'`));
  messages.push(
    system(`Print the response in this JSON format:
interface Response {
  grade: "Incorrect" | "Correct";

  // The explanation (and correct answer) is in ${language}.
  explanation: string;
}`),
  );

  const oaiRes = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    max_tokens: 1500,
  });

  let res = (oaiRes.data.choices[0].message?.content.trim() || "")
    .replaceAll("```json", "")
    .replaceAll("```", "");

  if (!isParseableJSON(res)) {
    console.log("Not parseable JSON, trying to parse as text", res);
    res = await parseJSON(res);
  }

  return new Response(res);
}
