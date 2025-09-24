import { repo } from "../../_lib/repo";
import { requireAdmin } from "../../_lib/roles";

export async function GET(req: Request) {
  const guard = requireAdmin(req); if (guard) return guard;
  return Response.json(repo.users.pending());
}
