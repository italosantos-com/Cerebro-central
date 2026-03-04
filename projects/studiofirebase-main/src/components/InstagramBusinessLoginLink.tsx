'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Variant = 'link' | 'button';

interface InstagramBusinessLoginLinkProps {
    variant?: Variant;
    children?: React.ReactNode;
    className?: string;
    forceReauth?: boolean;
}

/**
 * Minimal anchor/button to start Instagram Business Login.
 * Uses our backend route to keep state/callback secure.
 */
export function InstagramBusinessLoginLink({
    variant = 'button',
    children,
    className,
    forceReauth = false,
}: InstagramBusinessLoginLinkProps) {
    const href = forceReauth ? '/api/auth/instagram?force_reauth=true' : '/api/auth/instagram';

    if (variant === 'link') {
        return (
            <Link href={href} className={className} prefetch={false}>
                {children ?? 'Conectar com Instagram'}
            </Link>
        );
    }

    return (
        <Button asChild className={className} variant="outline">
            <Link href={href} prefetch={false}>
                {children ?? 'Conectar com Instagram'}
            </Link>
        </Button>
    );
}

export default InstagramBusinessLoginLink;
