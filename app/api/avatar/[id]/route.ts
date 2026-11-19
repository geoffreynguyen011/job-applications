import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 404 });

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT content_type, data FROM profile_pictures WHERE user_id = ?",
    [Number(id)]
  );
  if (!rows[0]) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(rows[0].data), {
    headers: {
      "Content-Type": rows[0].content_type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}