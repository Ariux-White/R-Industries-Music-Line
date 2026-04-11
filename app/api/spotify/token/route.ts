import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { code, redirect_uri } = await req.json();
  const client_id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    body: new URLSearchParams({
      code,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}