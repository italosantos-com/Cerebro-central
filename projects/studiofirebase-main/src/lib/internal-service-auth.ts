import type { NextRequest } from 'next/server';

export function isInternalRequest(request: NextRequest) {
    const token = request.headers.get('x-internal-token');
    const expected = process.env.INTERNAL_SERVICE_TOKEN;
    if (!expected) return false;
    return token === expected;
}
