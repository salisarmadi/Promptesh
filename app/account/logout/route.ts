import { endUserSession } from "@/lib/users/session";
import { redirect } from "next/navigation";
export async function POST() { await endUserSession(); redirect("/"); }
