import { NextRequest, NextResponse, userAgent } from 'next/server';

const addHttps = (s?: string) => (s ? `https://${s}` : s);

const mainOrigins = [
  'https://cap.so',
  'https://cap.link',
  'http://localhost',
  process.env.NEXT_PUBLIC_WEB_URL, // se serve, leggi solo variabili pubbliche
  addHttps(process.env.NEXT_PUBLIC_VERCEL_URL_HOST as string),
  addHttps(process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL_HOST as string),
  addHttps(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL_HOST as string),
].filter(Boolean) as string[];

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // anti-clickjacking per /login
  if (path.startsWith('/login')) {
    const res = NextResponse.next();
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    res.headers.set('Content-Security-Policy', 'frame-ancestors https://cap.so');
    return res;
  }

  // se non è CAP “prod”, lascia passare (come prima)
  if (process.env.NEXT_PUBLIC_IS_CAP !== 'true') {
    if (
      !(
        path.startsWith('/s/') ||
        path.startsWith('/dashboard') ||
        path.startsWith('/onboarding') ||
        path.startsWith('/api') ||
        path.startsWith('/login') ||
        path.startsWith('/invite') ||
        path.startsWith('/self-hosting') ||
        path.startsWith('/terms')
      ) &&
      process.env.NODE_ENV !== 'development'
    ) {
      return NextResponse.redirect(new URL('/login', url.origin));
    }
    return NextResponse.next();
  }

  if (mainOrigins.some((d) => url.origin.startsWith(d))) {
    return NextResponse.next();
  }

  const hostname = url.hostname;
  const webUrlHost = new URL(process.env.NEXT_PUBLIC_WEB_URL as string).hostname;

  // consenti solo /s/ sui custom domain
  if (!path.startsWith('/s/')) {
    const rewrite = new URL(request.url);
    rewrite.hostname = webUrlHost;
    return NextResponse.redirect(rewrite);
  }

  // cookie di verifica
  const verified = request.cookies.get('verified_domain');
  if (verified?.value === hostname) {
    const res = NextResponse.next();
    annotate(res, request);
    return res;
  }

  // chiamata edge-safe alla API Node che interroga il DB
  const verifyUrl = new URL('/api/internal/verify-domain', request.url);
  verifyUrl.searchParams.set('host', hostname);

  const r = await fetch(verifyUrl.toString(), { method: 'GET', cache: 'no-store' });
  const data = (await r.json().catch(() => ({ ok: false }))) as { ok: boolean };

  if (!data.ok) {
    const redirect = new URL(request.url);
    redirect.hostname = webUrlHost;
    return NextResponse.redirect(redirect);
  }

  const res = NextResponse.next();
  res.cookies.set('verified_domain', hostname, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600,
  });
  annotate(res, request);
  return res;
}

function annotate(res: NextResponse, req: NextRequest) {
  const { pathname } = req.nextUrl;
  const referrer = req.headers.get('referer') || '';
  const ua = userAgent(req);
  res.headers.set('x-pathname', pathname);
  res.headers.set('x-referrer', referrer);
  res.headers.set('x-user-agent', JSON.stringify(ua));
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
