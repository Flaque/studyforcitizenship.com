// In deno, read from questions
import { questions } from "./data/questions.js";
import { languages } from "./data/languages.js";
import { OpenAIApi, Configuration } from "npm:openai@3.2";

const configuration = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});
const openai = new OpenAIApi(configuration);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log(languages);

async function translate(language: string) {
  Deno.mkdir(`./data/${language}`, { recursive: true });

  let translatedQuestions = [];

  // For each language, translate each question
  // and write it to a file in the language folder, called "questions.json"
  let i = 0;
  for (let question of questions) {
    i += 1;
    await sleep(50 + Math.random() * 100);
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Translate this question from the US citizenship test to the language with the ISO code: '${language}':

${question.question}`,
        },
      ],
    });

    const translatedQuestion = response.data.choices[0].message.content.trim();

    translatedQuestions.push({
      question: translatedQuestion,
      number: question.number,
    });

    await Deno.writeTextFile(
      `./data/${language}/questions.json`,
      JSON.stringify(translatedQuestions, null, 2),
      { create: true }
    );

    console.log(`translated ${language} question `, i, "/", questions.length);
  }
}

const promises = languages.map((language) => translate(language));

await Promise.all(promises);
