import Quiz from "@/app/quiz";

export default function Page({ params }: { params: { lang: string } }) {
  return <Quiz lang={params.lang} />;
}
