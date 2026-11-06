import "@fontsource-variable/schibsted-grotesk";
import "@/app/globals.css";
import { useEffect, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { usePathname } from "next/navigation";
import HomePage from "@/app/page";
import ConnexionPage from "@/app/connexion/page";
import EspaceLayout from "@/app/(espace)/layout";
import TableauDeBord from "@/app/(espace)/tableau-de-bord/page";
import Saisie from "@/app/(espace)/saisie/page";
import Historique from "@/app/(espace)/historique/page";
import Statistiques from "@/app/(espace)/statistiques/page";
import Recommandations from "@/app/(espace)/recommandations/page";
import Pilotes from "@/app/(espace)/pilotes/page";
import Etablissements from "@/app/(espace)/etablissements/page";
import Utilisateurs from "@/app/(espace)/utilisateurs/page";
import Parametres from "@/app/(espace)/parametres/page";

const ESPACE: Record<string, ComponentType> = {
  "/tableau-de-bord": TableauDeBord,
  "/saisie": Saisie,
  "/historique": Historique,
  "/statistiques": Statistiques,
  "/recommandations": Recommandations,
  "/pilotes": Pilotes,
  "/etablissements": Etablissements,
  "/utilisateurs": Utilisateurs,
  "/parametres": Parametres,
};

const TITLES: Record<string, string> = {
  "/tableau-de-bord": "Tableau de bord", "/saisie": "Saisir une pesée", "/historique": "Historique",
  "/statistiques": "Statistiques", "/recommandations": "Recommandations", "/pilotes": "Pilotes",
  "/etablissements": "Établissements", "/utilisateurs": "Utilisateurs", "/parametres": "Paramètres", "/connexion": "Connexion",
};

function App() {
  const path = usePathname();
  const Page = ESPACE[path];

  useEffect(() => {
    document.title = TITLES[path] ? `${TITLES[path]} · Kanari` : "Kanari";
    const section = !Page && path !== "/connexion" && path !== "/" ? document.getElementById(path.slice(1)) : null;
    if (section) section.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [path, Page]);

  if (Page) return <EspaceLayout><Page /></EspaceLayout>;
  if (path === "/connexion") return <ConnexionPage />;
  return <HomePage />;
}

createRoot(document.getElementById("root")!).render(<App />);
