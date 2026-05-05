import { redirect } from "next/navigation";

/** /meteo → /meteo/le-grau-du-roi (la commune-pivot du média). */
export default function MeteoIndexPage() {
  redirect("/meteo/le-grau-du-roi");
}
