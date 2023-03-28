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
import { langs } from "./langs";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Dyanmic import of the questions
const useQuestions = (language: string) => {
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    import(`../data/${language}/questions.json`)
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

  // If we have a "startAt", put it at the top of the current queue
  useEffect(() => {
    console.log("what?", questions);
    if (questions.length === 0) return;
    console.log("no start at?", startAt);
    if (!startAt) return;

    // Remove it from the current array if it's there
    const startAtQuestion = questions.find((q: any) => q.number === startAt);
    const withoutStartAt = current.filter((q) => q.number !== startAt);

    console.log([startAtQuestion, ...withoutStartAt]);

    // Add it to the front of the current array
    setCurrent([startAtQuestion, ...withoutStartAt]);
  }, [startAt, questions]);

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
        number: first.number,
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
      // If we're at the end of the current and previous queues
      // then we're done!
      if (current.length === 1 && previous.length === 0) {
        // Reset the state
        setCurrent([]);
        setPrevious([]);

        return;
      }

      setCurrent((current) => {
        const withoutFirst = current.slice(1);

        // and pop off something from the previous queue
        const next = previous[0];

        return [...withoutFirst, next];
      });

      setPrevious((prev) => {
        // pop off something from the previous queue
        const withoutFirst = prev.slice(1);

        // If there's nothing left in the previous queue

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

  const router = useRouter();

  if (!first) return <div></div>;
  if (!questions) return <div></div>;

  // progress nodes
  const currents = current.map((q) => q.number);
  const pasts = previous.map((q) => q.number);

  return (
    <div className="flex flex-col">
      <div className="flex sm:flex-row flex-col-reverse bg-gray-100 h-screen justify-end">
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
        <div className="px-8 sm:py-4 pt-4 pb-8 sm:h-screen sm:border-b-0 border-b bg-white flex flex-col items-center justify-between w-full">
          <div className="w-full flex sm:justify-between items-center gap-2 flex-wrap">
            <div className=" text-gray-600 text-sm font-serif hidden sm:flex">
              Study for the US Citizenship Test!
            </div>
            <div>
              <select
                value={lang}
                className="border text-sm p-1 rounded text-gray-600"
                onChange={(e) => {
                  router.push(`/${e.target.value}/study`);
                }}
              >
                {langs.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} {l.flag}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-4 max-w-xl mx-auto w-full">
            <div>
              <div className="text-gray-500 pb-1">
                Question #{first?.number}
              </div>
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
          <div></div>
        </div>
      </div>
      <Image
        alt="A painting of an infinite golden gate bridge"
        src={"/goldengates.png"}
        width={6016}
        height={1024}
        className="border-y border-black"
      />
      <div className=" pb-12 py-12 border-black px-4">
        <div className="flex max-w-4xl mx-auto gap-8 items-start">
          <div className="flex flex-col pt-12 md:flex-wrap items-center justify-center gap-8 mx-auto w-full">
            <div className="max-w-md">
              <h2 className="font-serif text-xl pb-2 ">
                This is a practice exam for the US naturalization test.
              </h2>
              <p className="">
                All questions are graded by GPT, an AI created by OpenAI. The
                actual test is an oral test graded by a USCIS officer. You'll be
                asked 10 of 100 of these questions and you'll need to get 6 of
                them right to pass. You can find{" "}
                <a
                  className="underline"
                  href="https://www.uscis.gov/sites/default/files/document/questions-and-answers/100q.pdf"
                >
                  the full list of questions and rules here.
                </a>
              </p>
            </div>
            <div className="gap-2 max-w-md">
              <h2 className="font-serif text-xl pb-2">
                It's created by Evan Conrad.
              </h2>
              <p className="">
                I work on AI in San Francisco, the city of progress. If you find
                a bug, please send me a DM on Twitter:{" "}
                <a className="underline" href="https://twitter.com/evanjconrad">
                  @evanjconrad
                </a>
                .
              </p>
            </div>
            <div className="gap-2 max-w-md">
              <h2 className="font-serif text-xl pb-2">
                Support other civic work.
              </h2>
              <div className="">
                This project was inspired by the work of the following projects.
                <ul className="pl-4 list-disc pt-4 gap-2 flex flex-col">
                  <li>
                    <a
                      className="underline"
                      href="https://www.plymouthstreet.org/"
                    >
                      Plymouth Street
                    </a>{" "}
                    - Personalized application support for O1, EB1/2, and J1
                    visas.
                  </li>
                  <li>
                    <a className="underline" href="https://yimbyaction.org/">
                      YIMBY Action
                    </a>{" "}
                    - the movement to build more places to live, make rent
                    cheaper, stop evictions, and welcome new immigrants.
                  </li>
                  <li>
                    <a className="underline" href="https://progress.institute/">
                      Institute for Progress
                    </a>{" "}
                    - the folks working to make the USA faster at doing things,
                    like processing your immigration paperwork.
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="relative">
            <Image
              alt="A painting of the statue of liberty"
              src={"/liberty.png"}
              width={1024}
              height={1856}
              className="hidden md:flex border-x border-b border-black relative z-10"
            />
            <div className="pattern w-64 top-8 h-full -right-12 absolute z-0"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
