import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Changed function name from 'middleware' to 'proxy'
export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const url = request.nextUrl.clone()

    // 1. Auth Protection
    if (!user && (url.pathname.startsWith('/home') || url.pathname.startsWith('/admin'))) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. Onboarding Gate
    if (user && !url.pathname.startsWith('/onboarding') && !url.pathname.startsWith('/login')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, signature_url')
            .eq('id', user.id)
            .single()

        if (!profile?.full_name || !profile?.signature_url) {
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    // 3. Admin Security Gate (Saksham & College Email)
    if (url.pathname.startsWith('/admin')) {
        const ADMIN_EMAILS = [
            'sakshamsharma614@gmail.com',
            'adsechristuniversity400@gmail.com'
        ]

        if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
            url.pathname = '/home'
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: ['/home/:path*', '/admin/:path*', '/onboarding/:path*'],
}