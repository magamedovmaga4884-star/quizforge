import { Suspense } from "react";
import PlayClient from "./PlayClient";

export function generateStaticParams() {
  return [{ roomCode: "default" }];
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Загрузка теста...</div>}>
      <PlayClient />
    </Suspense>
  );
}
