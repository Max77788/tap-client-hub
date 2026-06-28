export async function GET() {
  return new Response(JSON.stringify({ hello: "world" }), {
    headers: { "content-type": "application/json" },
  });
}
