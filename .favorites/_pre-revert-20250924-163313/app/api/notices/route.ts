import { NextResponse } from "next/server";

type Notice = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  createdAt: number;   // epoch ms
  updatedAt?: number;
};

// 모듈 스코프 메모리 저장소 (개발용)
let NOTICES: Notice[] = [
  // 초기 예시 한 건 (원하면 비워도 됨)
  {
    id: "seed-1",
    title: "환영합니다 🎉",
    body: "여기에서 공지를 작성/수정/삭제하고 핀으로 고정할 수 있어요.",
    pinned: true,
    createdAt: Date.now() - 1000 * 60 * 60,
  },
];

function sorted(list: Notice[]) {
  return [...list].sort((a, b) => {
    // pinned 우선, 그 다음 최신순
    if ((Number(!!b.pinned) - Number(!!a.pinned)) !== 0) return Number(!!b.pinned) - Number(!!a.pinned);
    return (new Date(b.createdAt ?? 0).getTime()) - (new Date(a.createdAt ?? 0).getTime());
  });
}

/** 목록 */
export async function GET() {
  return NextResponse.json(sorted(NOTICES), { status: 200 });
}

/** 생성: { title, body } */
export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();
    if (!title || !body) {
      return new NextResponse("title/body required", { status: 400 });
    }
    const n: Notice = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      title: String(title).slice(0, 200),
      body: String(body).slice(0, 5000),
      pinned: false,
      createdAt: Date.now(),
    };
    NOTICES.unshift(n);
    return NextResponse.json(n, { status: 201 });
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }
}

/** 수정/핀: { id, title?, body?, pinned? } */
export async function PATCH(req: Request) {
  try {
    const { id, title, body, pinned } = await req.json();
    if (!id) return new NextResponse("id required", { status: 400 });
    const idx = NOTICES.findIndex(n => n.id === id);
    if (idx < 0) return new NextResponse("not found", { status: 404 });

    const cur = NOTICES[idx];
    const next: Notice = {
      ...cur,
      title: typeof title === "string" ? title.slice(0, 200) : cur.title,
      body:  typeof body  === "string" ? body.slice(0, 5000)   : cur.body,
      pinned: typeof pinned === "boolean" ? pinned : cur.pinned,
      updatedAt: Date.now(),
    };
    NOTICES[idx] = next;
    return NextResponse.json(next, { status: 200 });
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }
}

/** 삭제: /api/notices?id=... */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return new NextResponse("id required", { status: 400 });
  const before = NOTICES.length;
  NOTICES = NOTICES.filter(n => n.id !== id);
  if (NOTICES.length === before) return new NextResponse("not found", { status: 404 });
  return new NextResponse(null, { status: 204 });
}
