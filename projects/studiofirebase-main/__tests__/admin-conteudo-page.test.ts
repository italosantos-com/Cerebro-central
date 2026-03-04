import { applyContentItemEdit } from '@/app/admin/conteudo/content-item-utils';

describe('applyContentItemEdit', () => {
  it('atualiza somente o item em edição com título, categoria e conteúdo', () => {
    const result = applyContentItemEdit(
      [
        { id: '1', title: 'Missão', category: 'non-profit', content: 'Texto missão' },
        { id: '2', title: 'Visão', category: 'non-profit', content: 'Texto visão' },
      ],
      '1',
      { title: 'Nova Missão', category: 'institucional', content: 'Texto atualizado' }
    );

    expect(result[0]).toMatchObject({
      id: '1',
      title: 'Nova Missão',
      category: 'institucional',
      content: 'Texto atualizado',
    });
    expect(result[0].updatedAt).toBeInstanceOf(Date);
    expect(result[1]).toEqual({
      id: '2',
      title: 'Visão',
      category: 'non-profit',
      content: 'Texto visão',
    });
  });
});
