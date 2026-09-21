import TestResultsClient from "./TestResultsClient";

export function generateStaticParams() {
  return [{ id: "default" }];
}

export default function Page() {
  return <TestResultsClient />;
}
