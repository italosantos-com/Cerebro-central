interface ContentItemForEdit {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt?: unknown;
}

export function applyContentItemEdit<T extends ContentItemForEdit>(
  items: T[],
  editingId: string,
  nextItem: { title: string; category: string; content: string }
): T[] {
  return items.map((item) =>
    item.id === editingId
      ? {
          ...item,
          title: nextItem.title,
          category: nextItem.category,
          content: nextItem.content,
          updatedAt: new Date(),
        }
      : item
  );
}
