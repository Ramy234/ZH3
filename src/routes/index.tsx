import { createFileRoute } from "@tanstack/react-router";
import { Navigator } from "@/components/navigator/Navigator";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Navigator />;
}
