import { Suspense } from "react";
import ResultClient from "./ResultClient";

export function generateStaticParams() {
  return [{ roomCode: "default" }];
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Загрузка результатов...</div>}>
      <ResultClient />
    </Suspense>
  );
}
