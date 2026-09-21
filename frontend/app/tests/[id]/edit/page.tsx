import EditClient from "./EditClient";

export function generateStaticParams() {
  return [{ id: "default" }];
}

export default function Page() {
  return <EditClient />;
}
