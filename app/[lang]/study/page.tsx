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
import confetti from "canvas-confetti";
import useSound from "use-sound";

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
  const [playSuccess] = useSound("/success.wav");
  const [playFailure] = useSound("/wrong_answer.wav", {
    volume: 0.1,
  });

  // Two queues.
  let [current, setCurrent] = useState<Array<any>>([]);
  let [previous, setPrevious] = useState<Array<any>>([]);

  // current can only have 10 questions
  if (current.length > 10) {
    current = current.slice(0, 10);
  }

  useEffect(() => {
    // If there are nothing in current, then we need to fetch some.
    if (questions.length === 0) return;
    if (current.length === 0) {
      setCurrent(questions.slice(0, 10));

      // Add the rest to past
      setPrevious(questions.slice(10));
    }
  }, [questions]);

  const first = current[0];

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
      if (grade === "Correct") {
        confetti({
          disableForReducedMotion: true,
          particleCount: 100,
        });
        playSuccess();
      } else {
        playFailure({});
        const div = document.getElementById("explanationBox");
        if (!div) return;
        div.classList.add("shake-animation");

        // Remove the shake-animation class after the animation is completed
        setTimeout(() => {
          div.classList.remove("shake-animation");
        }, 800);
      }

      setResult({ grade, explanation });
    } catch (err) {
      alert("Something went wrong grading the answer! Please try again later.");
    }
  }

  function onNextQuestion() {
    if (!result) return;
    // If they got the question correct
    // then we add it to the end of the "previous" queue
    // and pop it off the "current" queue
    if (result.grade === "Correct") {
      setCurrent((current) => {
        const withoutFirst = current.slice(1);

        // and pop off something from the previous queue
        const next = previous[0];

        return [...withoutFirst, next];
      });

      setPrevious((prev) => {
        // pop off something from the previous queue
        const withoutFirst = prev.slice(1);

        return [...withoutFirst, first];
      });
    } else {
      // If they got the question wrong
      // then we add it to the end of the "current" queue
      // and pop it off the "current" queue
      setCurrent((current) => {
        // pop it off the current queue
        // and add it to the end of the current queue
        const withoutFirst = current.slice(1);
        return [...withoutFirst, first];
      });
    }

    setResult(null);
    setInput("");
  }

  // If there's a "result", and the user presses "enter"
  // then go to the next question
  useEffect(() => {
    if (result) {
      const handleEnter = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          onNextQuestion();
        }
      };
      window.addEventListener("keydown", handleEnter);
      return () => window.removeEventListener("keydown", handleEnter);
    }
  }, [result]);

  if (!first) return <div></div>;
  if (!questions) return <div></div>;

  // progress nodes
  const currents = current.map((q) => q.number);
  const pasts = previous.map((q) => q.number);

  return (
    <div className="flex flex-row ">
      <div className="flex flex-col p-4 bg-gray-100 border-r">
        <div className="flex justify-start w-32 gap-2 flex-wrap">
          {currents.map((v) => (
            <div className="h-6 w-6 text-xs bg-blue-200 rounded-full items-center justify-center flex">
              {v}
            </div>
          ))}
          {pasts.map((v) => (
            <div className="h-6 w-6 text-xs bg-red-200 rounded-full items-center justify-center flex ">
              {v}
            </div>
          ))}
        </div>
      </div>
      <div className="px-8 py-4 h-screen flex flex-col items-center justify-center w-full">
        <div className="flex flex-col gap-4 pt-4 max-w-xl mx-auto w-full">
          {/* <div className="flex flex-1 justify-start w-64">{avatars}</div> */}

          <div>
            <div className="text-gray-500 pb-1">Question #{first?.number}</div>
            <h1
              className="text-xl font
        -bold"
            >
              {first?.question}
            </h1>
          </div>

          <div id="explanationBox">
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
              autoFocus
            />
            <div
              className={cn({
                hidden: !result,
                "flex relative  flex-col  border rounded-b transition-all ":
                  true,
                "border-green-500  bg-green-50": result?.grade === "Correct",
                "border-red-500 bg-red-50": result?.grade === "Incorrect",
              })}
            >
              <div className="p-2">{result?.explanation}</div>
            </div>
          </div>

          {!result && (
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
          )}
          {result && (
            <div>
              <button
                onClick={() => {
                  onNextQuestion();
                }}
                className="interact-bounce border border-black border-b-2 rounded py-2 px-4 items-center justify-between flex w-full"
              >
                Next Question <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
