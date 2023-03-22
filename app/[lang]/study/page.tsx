"use client";

import cn from "classnames";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dyanmic import of the questions
const useQuestions = (language: string) => {
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    import(`../../../data/${language}/questions.json`).then((data) => {
      setQuestions(data.questions);
    });
  }, [language]);
  return questions;
};

// Uses local storage
function useLocalStorage(key: string, defaultValue: any) {
  const [state, setState] = useState(() => {
    const localData =
      typeof window !== "undefined" && window.localStorage.getItem(key);
    return localData ? JSON.parse(localData) : defaultValue;
  });

  useEffect(() => {
    typeof window !== "undefined" &&
      window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

export default function StudyPage() {
  const language = "en";
  const questions = useQuestions(language);

  // Two queues.
  let [current, setCurrent] = useLocalStorage(language + ":current", []);
  const [past, setPast] = useLocalStorage(language + ":past", []);

  // current can only have 10 questions
  if (current.length > 10) {
    current = current.slice(0, 10);
  }

  // If current is empty, fill it with 10 questions
  useEffect(() => {
    if (!questions) return;

    if (current.length === 0) {
      const newCurrent = questions.slice(0, 10);
      setCurrent(newCurrent);
    }
  }, [current, questions]);

  const first = current[0];

  const avatars = current.map((q: any, i: number) => {
    return (
      <div key={q} className="flex-1 items-center justify-center flex">
        <img
          src={`/api/svgs/${encodeURIComponent(q?.question || "foo")}`}
          className={cn({
            "w-4 flex mx-auto rounded-full border border-black": true,
            "w-6": i === 0,
            "opacity-50": i > 0,
          })}
        />
      </div>
    );
  });

  const [input, setInput] = useState("");

  async function onGrade() {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: first?.question,
        answer: input,
      }),
    });
    const data = await response.text();
    console.log(data);
  }

  if (!first) return <div></div>;

  return (
    <div className="px-4 py-4 bg-gray-50 h-screen">
      <div className="flex flex-col gap-4 pt-4 max-w-xl mx-auto">
        <div className="flex flex-1 justify-start w-64">{avatars}</div>

        <h1 className="text-xl font-bold">{first?.question}</h1>
        <textarea
          className="w-full h-32 border rounded p-2 border-gray-400"
          placeholder="Type your answer here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="">
          <button
            onClick={onGrade}
            className="bg-blue-500 interact-bounce text-white rounded py-2 px-4"
          >
            <span>Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
