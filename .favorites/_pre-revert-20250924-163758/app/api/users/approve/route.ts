import { repo } from "../../_lib/repo";
import { requireAdmin } from "../../_lib/roles";

export async function POST(req: Request) {
  const guard = requireAdmin(req); if (guard) return guard;
  const { id, displayName } = await req.json();
  if (!id || !displayName) return new Response("bad request", { status: 400 });
  try {
    const u = repo.users.approve(id, displayName);
    return Response.json(u);
  } catch (e: any) {
    return new Response(e.message, { status: 404 });
  }
}
