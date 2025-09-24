import { repo } from "../../_lib/repo";

export async function GET() {
  const list = repo.users.approved().map(u => ({ id: u.id, displayName: u.displayName || u.id }));
  return Response.json(list);
}
