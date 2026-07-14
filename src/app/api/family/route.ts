// src/app/api/family/route.ts
// Family Wall API — GET lists bricks, POST adds a brick.
// Data lives in the `familybricks` collection of your existing MongoDB.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { familyWelcomeHtml, sendEmail, syncToMailchimp } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TITLES = [
  'Grandma', 'Grandpa', 'Mumma', 'Papa', 'Sister', 'Brother', 'Auntie',
  'Uncle', 'Cousin', 'Nephew', 'Niece', 'Little', 'Big', 'Friend',
] as const;

type Title = (typeof TITLES)[number];

interface Brick {
  title: Title;
  name: string;
  email?: string;
  createdAt: Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  // Strip control chars, collapse whitespace, trim, cap length.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional
  const cleaned = input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 1 || cleaned.length > 24) return null;
  return cleaned;
}

export async function GET() {
  try {
    const db = await getDb();
    const bricks = await db
      .collection<Brick>('familybricks')
      .find({}, { projection: { _id: 0, title: 1, name: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray();
    return NextResponse.json({ bricks });
  } catch (err) {
    console.error('[family GET]', err);
    return NextResponse.json({ error: 'Unable to load the wall right now.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const title = body.title as string;
    const name = sanitizeName(body.name);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!TITLES.includes(title as Title)) {
      return NextResponse.json({ error: 'Please choose a valid title.' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Please enter a name (1-24 characters).' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
    }

    const db = await getDb();
    const brick: Brick = { title: title as Title, name, email, createdAt: new Date() };
    await db.collection<Brick>('familybricks').insertOne(brick);

    // Best-effort side effects — never block or fail the signup on these.
    await Promise.allSettled([
      syncToMailchimp(email, { FNAME: name, MMERGE_TITLE: title }, ['family-wall']),
      sendEmail({
        to: email,
        subject: 'Welcome to the family',
        html: familyWelcomeHtml(name, title),
      }),
    ]);

    return NextResponse.json(
      { brick: { title: brick.title, name: brick.name, createdAt: brick.createdAt } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[family POST]', err);
    return NextResponse.json({ error: 'Unable to add to the wall right now.' }, { status: 500 });
  }
}
