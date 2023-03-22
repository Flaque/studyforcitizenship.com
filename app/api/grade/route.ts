import { NextApiRequest } from "next";
import { OpenAIApi, Configuration } from "openai";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const openai = new OpenAIApi(config);

export async function POST(request: Request) {
  const r = await request.json();
  const { question, answer } = r;

  console.log("question", question, "answer", answer);

  if (!question || !answer) {
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
- Partially correct
- Correct

Question: ${question}
Answer: "${answer}"

Use the following format:
Grade: {grade}
Explanation: {explanation in the language the question and answer is in}`,
      },
    ],
  });

  const res = oaiRes.data.choices[0].message?.content.trim() || "";

  return new Response(res);
}
