import { info } from "console";
import { load } from "cheerio";
import { Configuration, OpenAIApi } from "openai";
import { STATE_TO_WIKIPEDIA_PAGE_TITLE_OVERRIDE } from "@/app/constants";
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const openai = new OpenAIApi(config);

export async function getHouseRepresentatives(state: string) {
  try {
    const url = `https://api.propublica.org/congress/v1/members/house/${state}/current.json`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.PROPUBLICA_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const representatives = data.results.map((rep: any) => {
      console.log(rep);
      return {
        name: `${rep.first_name} ${rep.last_name}`,
        party: rep.party,
        district: rep.district,
      };
    });

    console.log(representatives);
    return representatives;
  } catch (error) {
    console.error(`Failed to fetch state representatives: ${error}`);
  }
}

export async function getSenateRepresentatives(state: string) {
  try {
    const url = `https://api.propublica.org/congress/v1/members/senate/${state}/current.json`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.PROPUBLICA_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const representatives = data.results.map((rep: any) => {
      console.log(rep);
      return {
        name: `${rep.first_name} ${rep.last_name}`,
        party: rep.party,
        district: rep.district,
      };
    });

    console.log(representatives);
    return representatives;
  } catch (error) {
    console.error(`Failed to fetch state representatives: ${error}`);
  }
}

export async function getChiefJusticeFromWikipedia() {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/Chief_Justice_of_the_United_States`,
  );

  const html = await response.text();
  const $ = load(html);

  const infobox = $(".infobox").first();

  infobox.find("style").remove();
  infobox.find("script").remove();

  // Remove .maptable
  infobox.find(".maptable").remove();

  // remove .catagory
  infobox.find(".category").remove();

  // remove .infobox-above
  infobox.find(".infobox-above").remove();

  // Insert a space in between every th and td
  infobox.find("th").after(": ");

  // Insert a space after every td
  infobox.find(".mergedtoprow").after(" ");

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Based on the following text, print the name of the chief justice, for example "John Smith".

${infobox.text()}`,
      },
    ],
  });

  return result.data.choices[0].message?.content.trim() || "Unknown";
}

export async function getPresidentFromWikipedia() {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/President_of_the_United_States`,
  );

  const html = await response.text();
  const $ = load(html);

  const infobox = $(".infobox").first();

  infobox.find("style").remove();
  infobox.find("script").remove();

  // Remove .maptable
  infobox.find(".maptable").remove();

  // remove .catagory
  infobox.find(".category").remove();

  // remove .infobox-above
  infobox.find(".infobox-above").remove();

  // Insert a space in between every th and td
  infobox.find("th").after(": ");

  // Insert a space after every td
  infobox.find(".mergedtoprow").after(" ");

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Based on the following text, print the name of the president, for example "John Smith".

${infobox.text()}`,
      },
    ],
  });

  return result.data.choices[0].message?.content.trim() || "Unknown";
}

export async function getVicePresidentFromWikipedia() {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/Vice_President_of_the_United_States`,
  );

  const html = await response.text();
  const $ = load(html);

  const infobox = $(".infobox").first();

  infobox.find("style").remove();
  infobox.find("script").remove();

  // Remove .maptable
  infobox.find(".maptable").remove();

  // remove .catagory
  infobox.find(".category").remove();

  // remove .infobox-above
  infobox.find(".infobox-above").remove();

  // Insert a space in between every th and td
  infobox.find("th").after(": ");

  // Insert a space after every td
  infobox.find(".mergedtoprow").after(" ");

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Based on the following text, print the name of the vice president, for example "John Smith".

${infobox.text()}`,
      },
    ],
  });

  return result.data.choices[0].message?.content.trim() || "Unknown";
}

export async function getPoliticalPartyOfPresidentFromWikipedia() {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/President_of_the_United_States`,
  );

  const html = await response.text();
  const $ = load(html);

  const infobox = $(".infobox").first();

  infobox.find("style").remove();
  infobox.find("script").remove();

  // Remove .maptable
  infobox.find(".maptable").remove();

  // remove .catagory
  infobox.find(".category").remove();

  // remove .infobox-above
  infobox.find(".infobox-above").remove();

  // Insert a space in between every th and td
  infobox.find("th").after(": ");

  // Insert a space after every td
  infobox.find(".mergedtoprow").after(" ");

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Based on the following text, print the political party of the president, for example "Republican".

${infobox.text()}`,
      },
    ],
  });

  return result.data.choices[0].message?.content.trim() || "Unknown";
}

export async function getSpeakerOfTheHouseFromWikipedia() {
  console.log("getSpeakerOfTheHouseFromWikipedia");

  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/Speaker_of_the_United_States_House_of_Representatives`,
  );

  const html = await response.text();
  const $ = load(html);

  const infobox = $(".infobox").first();

  infobox.find("style").remove();
  infobox.find("script").remove();

  // Remove .maptable
  infobox.find(".maptable").remove();

  // remove .catagory
  infobox.find(".category").remove();

  // remove .infobox-above
  infobox.find(".infobox-above").remove();

  // Insert a space in between every th and td
  infobox.find("th").after(": ");

  // Insert a space after every td
  infobox.find(".mergedtoprow").after(" ");

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Based on the following text, print the name of the speaker of the house, for example "John Smith".

${infobox.text()}`,
      },
    ],
  });

  return result.data.choices[0].message?.content.trim() || "Unknown";
}

async function getWikiInfobox(pageTitle: string): Promise<string> {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/${pageTitle}`,
  );
  const html = await response.text();

  // get the .infobox
  const $ = load(html);

  // Remove the css and javascript tags
  // just take the first infobox
  const infobox = $(".infobox").first();

  infobox.find("style").remove();
  infobox.find("script").remove();

  // Remove .maptable
  infobox.find(".maptable").remove();

  // remove .catagory
  infobox.find(".category").remove();

  // remove .infobox-above
  infobox.find(".infobox-above").remove();

  // Insert a space in between every th and td
  infobox.find("th").after(": ");

  // Insert a space after every td
  infobox.find(".mergedtoprow").after(" ");

  return infobox.text();
}

export async function getStateData(stateName: string) {
  const infobox = await getWikiInfobox(
    STATE_TO_WIKIPEDIA_PAGE_TITLE_OVERRIDE[stateName] ?? stateName,
  );

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Print a JSON object for the following information, using the following typescript type.

interface Response {
  governor: string;
  capital: string;
  senators: string[];
  house_members: string[];
}

${infobox}`,
      },
    ],
  });

  const response = result.data.choices[0].message?.content.trim();

  return JSON.parse(response || "{}") as {
    governor: string;
    capital: string;
    senators: string[];
    house_members: string[];
  };
}
