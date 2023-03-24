import Quiz from "@/app/quiz";

export default function Page({
  params,
}: {
  params: { lang: string; startAt: string };
}) {
  return <Quiz lang={params.lang} startAt={parseInt(params.startAt)} />;
}
