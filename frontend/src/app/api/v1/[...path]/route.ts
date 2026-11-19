import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveBackendV1Base(): string {
  const raw = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api/v1"
  ).replace(/\/+$/, "");

  if (raw.endsWith("/api/v1")) {
    return raw;
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return `${raw}/api/v1`;
  }
  return "http://localhost:8000/api/v1";
}

async function proxyToBackend(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const subPath = path.join("/");
  const backendBase = resolveBackendV1Base();
  const targetUrl = `${backendBase}/${subPath}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const bodyBuffer = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      redirect: "manual",
    });

    const respHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) respHeaders.set("content-type", upstreamType);
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) respHeaders.set("content-disposition", disposition);

    const setCookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];
    if (setCookies.length > 0) {
      for (const sc of setCookies) {
        respHeaders.append("set-cookie", sc);
      }
    } else {
      const singleCookie = upstream.headers.get("set-cookie");
      if (singleCookie) respHeaders.set("set-cookie", singleCookie);
    }

    if (upstream.status === 204 || upstream.status === 304) {
      return new NextResponse(null, {
        status: upstream.status,
        headers: respHeaders,
      });
    }

    const data = await upstream.arrayBuffer();
    return new NextResponse(data, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: "Backend Mimo API indisponible", error: String(err) },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(req, ctx);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(req, ctx);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(req, ctx);
}
