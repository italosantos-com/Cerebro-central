export function isAdminRoutePath(pathname: string | null | undefined): boolean {
    if (!pathname) return false;

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        return true;
    }

    const sluggedAdminMatch = pathname.match(/^\/([^/]+)\/admin(\/|$)/);
    if (sluggedAdminMatch && sluggedAdminMatch[1] !== 'api') {
        return true;
    }

    return false;
}
