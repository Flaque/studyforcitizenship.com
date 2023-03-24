"use client";

import cn from "classnames";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  ArrowRightIcon,
  MapPinIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import confetti from "canvas-confetti";
import useSound from "use-sound";
import { QUESTIONS_REQUIRING_STATE } from "./constants";

// Dyanmic import of the questions
const useQuestions = (language: string) => {
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    import(`../data/${language}/questions.json`)
      .then((data) => {
        // Randomize the questions
        for (let i = data.default.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [data.default[i], data.default[j]] = [
            data.default[j],
            data.default[i],
          ];
        }

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

export default function Quiz({
  lang,
  startAt,
}: {
  lang: string;
  startAt?: number;
}) {
  const language = lang;
  const questions = useQuestions(language);
  const [result, setResult] = useState<{
    grade: string;
    explanation: string;
  } | null>(null);

  interface UrlState {
    wrongs?: number[];
    rights?: number[];
  }

  const [urlState, setUrlState] = useState<UrlState>({});
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

  const first = startAt
    ? questions.find((q: any) => q.number === startAt)
    : current[0];

  const [input, setInput] = useState("");

  async function onGrade() {
    setIsLoading(true);
    console.log({
      number: first.number,
      question: first?.question,
      answer: input,
      language: language,
    });
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: first.number,
        question: first?.question,
        answer: input,
        language: language,
      }),
    });

    const data = await response.text();
    console.log(data);
    setIsLoading(false);
    try {
      const { grade, explanation } = JSON.parse(data);
      if (grade === "Correct") {
        confetti({
          disableForReducedMotion: true,
          particleCount: 100,
        });
        playSuccess();

        // set the rights
        setUrlState((state: any) => {
          const rights = state.rights || [];
          const wrongs = state.wrongs || [];
          return {
            ...state,
            rights: [...rights, first.number],
            wrongs: wrongs.filter((w: number) => w !== first.number),
          };
        });
      } else {
        playFailure({});
        const div = document.getElementById("explanationBox");
        if (!div) return;
        div.classList.add("shake-animation");

        // Remove the shake-animation class after the animation is completed
        setTimeout(() => {
          div.classList.remove("shake-animation");
        }, 800);

        // Set the "wrongs"
        setUrlState((state: any) => {
          const wrongs = state.wrongs || [];
          const rights = state.rights || [];
          return {
            ...state,
            wrongs: [...wrongs, first.number],
            rights: rights.filter((r: number) => r !== first.number),
          };
        });
      }

      setResult({ grade, explanation });
    } catch (err) {
      alert(
        "Something went wrong grading the answer! Please try again later.\n" +
          err
      );
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
    <div className="flex sm:flex-row flex-col-reverse bg-gray-100 h-screen justify-end  ">
      <div className="flex flex-col p-4 bg-gray-100 border-r">
        <div className="flex justify-start sm:w-32 gap-2 flex-wrap">
          {currents.map((v) => (
            <a
              href={`/${lang}/study/${v}`}
              key={v}
              className={cn({
                "h-6 w-6 text-xs  border rounded-full items-center justify-center flex":
                  true,
                "bg-green-500 text-white border-green-700":
                  urlState?.rights?.includes(v),
                "bg-red-500 text-white border-red-700":
                  urlState?.wrongs?.includes(v),
                "bg-white":
                  !urlState?.rights?.includes(v) &&
                  !urlState?.wrongs?.includes(v),
              })}
            >
              {v}
            </a>
          ))}
          {pasts.map((v) => (
            <a
              href={`/${lang}/study/${v}`}
              className={cn({
                "h-6 w-6 text-xs opacity-50 border rounded-full  items-center justify-center flex":
                  true,
                "bg-green-500 text-white border-green-700":
                  urlState?.rights?.includes(v),
                "bg-red-500 text-white border-red-700":
                  urlState?.wrongs?.includes(v),
                "bg-white":
                  !urlState?.rights?.includes(v) &&
                  !urlState?.wrongs?.includes(v),
              })}
            >
              {v}
            </a>
          ))}
        </div>
      </div>
      <div className="px-8 sm:py-4 pt-4 pb-8 sm:h-screen sm:border-b-0 border-b bg-white flex flex-col items-center justify-center w-full">
        <div className="flex flex-col gap-4 pt-4 max-w-xl mx-auto w-full">
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
            {QUESTIONS_REQUIRING_STATE.includes(first.number) && (
              <div
                className={cn({
                  "flex relative  items-center gap-2 border transition-all p-2 bg-blue-50 border-blue-500 rounded pb-2 mb-2 ":
                    true,
                })}
              >
                <MapPinIcon className="h-4 w-4" />
                Include the US state you live in when answering this question!
              </div>
            )}

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
              placeholder={
                QUESTIONS_REQUIRING_STATE.includes(first.number)
                  ? "Type your answer here, and mention what state you live in!"
                  : "Type your answer here!"
              }
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