import { Skiper39 } from "@/components/ui/skiper39";
import Link from "next/link";

export default function Skiper39Page() {
  return (
    <main className="relative min-h-screen">
      <Skiper39 />
      <Link className="absolute left-6 top-6 z-20 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black backdrop-blur-md transition hover:bg-white" href="/">
        Back to Zombie API
      </Link>
    </main>
  );
}
