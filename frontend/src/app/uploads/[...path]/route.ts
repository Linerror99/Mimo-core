import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveBackendOrigin(): string {
  const raw = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");

  const withoutApi = raw.replace(/\/api\/v1$/, "");
  if (withoutApi.startsWith("http://") || withoutApi.startsWith("https://")) {
    return withoutApi;
  }
  return "http://localhost:8000";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const targetUrl = `${resolveBackendOrigin()}/uploads/${path.join("/")}`;

  try {
    const headers = new Headers();
    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    const auth = req.headers.get("authorization");
    if (auth) headers.set("authorization", auth);

    const upstream = await fetch(targetUrl, { headers, redirect: "follow" });
    const respHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) respHeaders.set("content-type", contentType);
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) respHeaders.set("cache-control", cacheControl);

    const data = await upstream.arrayBuffer();
    return new NextResponse(data, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch {
    return NextResponse.json({ detail: "Fichier indisponible" }, { status: 502 });
  }
}
