import LobbyClient from "./LobbyClient";

export function generateStaticParams() {
  return [{ roomCode: "default" }];
}

export default function Page() {
  return <LobbyClient />;
}
