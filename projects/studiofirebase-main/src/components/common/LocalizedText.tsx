"use client";

import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { getDefaultText } from '@/localization/entries';

export type LocalizedTextProps<T extends ElementType> = {
  id: string;
  as?: T;
  defaultText?: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'children'>;

export function LocalizedText<T extends ElementType = 'span'>(props: LocalizedTextProps<T>) {
  const { id, as, defaultText, className, ...rest } = props;
  const Component = (as ?? 'span') as ElementType;
  const { translations } = useLocalization();
  const text = translations[id] ?? defaultText ?? getDefaultText(id);

  return (
    <Component data-localize-id={id} className={className} {...rest}>
      {text}
    </Component>
  );
}
