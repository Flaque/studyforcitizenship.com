import { OpenAIApi, Configuration } from "openai";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const openai = new OpenAIApi(config);

export async function POST(request: Request) {
  const r = await request.json();
  const { question, answer, language } = r;

  if (!question || !answer || !language) {
    return new Response("Missing question or answer", { status: 400 });
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

ISO Language: ${language}
Question: ${question}
Answer: "${answer}"

Respond in the following JSON format:
interface Response {
  grade: "Incorrect" | "Correct";

  // The explanation is in ${language}.
  explanation: string;
},`,
      },
    ],
    max_tokens: 1500,
  });

  const res = oaiRes.data.choices[0].message?.content.trim() || "";

  return new Response(res);
}
