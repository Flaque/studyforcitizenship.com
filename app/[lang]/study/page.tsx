"use client";

import cn from "classnames";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowRightIcon,
  BoltIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";

// Dyanmic import of the questions
const useQuestions = (language: string) => {
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    import(`../../../data/${language}/questions.json`)
      .then((data) => {
        setQuestions(data.default);
      })
      .catch((e) => {
        console.error(e);
      });
  }, [language]);
  return questions;
};

function Avatar(props: { question: string; highlighted: boolean }) {
  return (
    <div className="flex-1 items-center justify-center flex">
      <img
        src={`/api/svgs/${encodeURIComponent(props.question || "foo")}`}
        className={cn({
          "w-4 flex mx-auto rounded-full border border-black": true,
          "w-8": props.highlighted,
          "opacity-50": !props.highlighted,
        })}
      />
    </div>
  );
}

function Spinner() {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
  );
}

export default function StudyPage({ params }: { params: { lang: string } }) {
  const language = params.lang;
  const questions = useQuestions(language);
  const [result, setResult] = useState<{
    grade: string;
    explanation: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Two queues.
  let [current, setCurrent] = useState<Array<any>>([]);

  // current can only have 10 questions
  if (current.length > 10) {
    current = current.slice(0, 10);
  }

  useEffect(() => {
    // If there are nothing in current, then we need to fetch some.
    if (questions.length === 0) return;
    if (current.length === 0) {
      setCurrent(questions.slice(0, 10));
    }
  }, [questions]);

  const first = current[0];

  const avatars = current.map((q: any, i: number) => {
    return (
      <Avatar key={q.question} question={q.question} highlighted={i === 0} />
    );
  });

  const [input, setInput] = useState("");

  async function onGrade() {
    setIsLoading(true);
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: first?.question,
        answer: input,
        language: language,
      }),
    });
    const data = await response.text();
    setIsLoading(false);
    try {
      const { grade, explanation } = JSON.parse(data);
      setResult({ grade, explanation });
    } catch (err) {
      alert("Something went wrong grading the answer! Please try again later.");
    }
  }

  if (!first) return <div></div>;
  if (!questions) return <div></div>;

  return (
    <div className="px-4 py-4 h-screen flex flex-col items-center">
      <div className="flex flex-col gap-4 pt-4 max-w-xl mx-auto w-full">
        {/* <div className="flex flex-1 justify-start w-64">{avatars}</div> */}

        <h1
          className="text-xl font
        -bold"
        >
          {first?.question}
        </h1>

        <div>
          <input
            className={cn({
              "w-full h-12 border  rounded p-2 border-gray-400 transition-colors":
                true,
              "bg-green-500 border-0 rounded-b-none text-white":
                result && result.grade === "Correct",
              "bg-red-500 border-0 rounded-b-none text-white":
                result && result.grade === "Incorrect",
            })}
            disabled={!!result}
            placeholder="Type your answer here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onGrade();
              }
            }}
          />
          <div
            className={cn({
              hidden: !result,
              "flex relative  flex-col  border rounded-b transition-all ": true,
              "border-green-500  bg-green-50": result?.grade === "Correct",
              "border-red-500 bg-red-50": result?.grade === "Incorrect",
            })}
          >
            <div className="p-2">{result?.explanation}</div>
          </div>
        </div>

        {!result && (
          <div className="">
            <button
              onClick={onGrade}
              className={cn({
                "bg-blue-500 interact-bounce text-white rounded py-2 px-4 items-center justify-between flex w-full border-blue-700  transition-colors":
                  true,
                "border-b-2": !isLoading,
                "shadow-inner border-b border-t-2 bg-blue-600": isLoading,
              })}
              disabled={input.length === 0}
            >
              Check Answer{" "}
              {isLoading ? <Spinner /> : <PlayIcon className="h-4 w-4" />}
            </button>
          </div>
        )}
        {result && (
          <div>
            <button
              onClick={() => {
                // TODO: push previous questions onto the queue

                setCurrent(current.slice(1));
                setResult(null);
                setInput("");
              }}
              className="interact-bounce border border-black border-b-2 rounded py-2 px-4 items-center justify-between flex w-full"
            >
              Next Question <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
