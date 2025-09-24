export function requireAdmin(req: Request) {
  const role = req.headers.get("x-role"); // dev-only guard (프론트에서 넣음)
  if (role !== "admin") {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  return null;
}
