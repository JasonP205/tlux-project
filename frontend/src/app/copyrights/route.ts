import type { NextRequest } from "next/server";

import { LOCALES, PROJECTS, isLocale, localizeProject } from "@/data/copyrights";

/**
 * GET /copyrights            → toàn bộ project, đủ mọi locale (`Project[]`)
 * GET /copyrights?locale=vi  → cũng danh sách đó nhưng đã resolve về một ngôn ngữ
 *                              (`LocalizedProject[]`)
 *
 * Body là mảng trần để bên đọc `await res.json()` thẳng ra `Project[]`. Locale lạ
 * trả 400 kèm danh sách chấp nhận, thay vì lặng lẽ serve ngôn ngữ không ai hỏi.
 */

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  /* Chỉ đọc, công khai, không kèm credential — mục đích của feed này là để một
     origin khác render được credit. */
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
};

export function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("locale");

  if (requested !== null && !isLocale(requested)) {
    return Response.json(
      {
        error: `Unknown locale "${requested}".`,
        accepted: LOCALES,
      },
      { status: 400, headers: HEADERS },
    );
  }

  const body = requested
    ? PROJECTS.map((project) => localizeProject(project, requested))
    : PROJECTS;

  return Response.json(body, { headers: HEADERS });
}
