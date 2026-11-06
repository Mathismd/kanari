import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Invitation d'un utilisateur par l'administrateur.
// La clé service_role reste côté serveur ; l'appelant est authentifié par son jeton et doit être admin.

const schema = z.object({
  email: z.email("Adresse électronique invalide").max(200),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "collectivite", "responsable", "personnel", "association"]),
  establishmentId: z.string().uuid().nullable(),
  collectivityId: z.string().uuid().nullable(),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return json(503, { error: "Invitations indisponibles : configuration serveur manquante" });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Authentification requise" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: caller, error: authError } = await admin.auth.getUser(token);
  if (authError || !caller.user) return json(401, { error: "Session invalide" });

  const { data: callerProfile } = await admin.from("profiles").select("role, active").eq("id", caller.user.id).single();
  if (!callerProfile?.active || callerProfile.role !== "admin") return json(403, { error: "Réservé à l'administrateur" });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Requête invalide" });
  const input = parsed.data;

  if ((input.role === "responsable" || input.role === "personnel") && !input.establishmentId) {
    return json(400, { error: "Rattachez ce compte à un établissement" });
  }
  if (input.role === "collectivite" && !input.collectivityId) {
    return json(400, { error: "Rattachez ce compte à une collectivité" });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email.toLowerCase(), {
    data: { full_name: input.fullName },
    redirectTo: `${origin}/connexion`,
  });
  if (inviteError || !invited.user) {
    return json(400, { error: inviteError?.message.includes("already") ? "Cette adresse a déjà un compte" : "L'invitation a échoué" });
  }

  // Le profil est créé par le déclencheur avec le rôle minimal ; on applique ici le rôle choisi.
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      full_name: input.fullName,
      role: input.role,
      establishment_id: input.establishmentId,
      collectivity_id: input.collectivityId,
    })
    .eq("id", invited.user.id);
  if (updateError) return json(500, { error: "Compte créé mais rôle non appliqué : corrigez-le dans la liste" });

  return json(201, { ok: true });
}
