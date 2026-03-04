import path from 'path';
import { buildBrainContext, brainContextToSystemPrompt, setDatasetsDir } from '@/lib/brain-context';

// Point the context builder to the real datasets directory before all tests
beforeAll(() => {
  setDatasetsDir(path.join(__dirname, '..', 'datasets'));
});

describe('buildBrainContext', () => {
  it('retorna context com regras e persona a partir dos datasets locais', async () => {
    const ctx = await buildBrainContext({ userInput: 'Qual o valor?' });

    expect(ctx.rules.length).toBeGreaterThan(0);
    expect(typeof ctx.persona).toBe('string');
    expect(typeof ctx.globalStyle).toBe('string');
    expect(Array.isArray(ctx.context)).toBe(true);
  });

  it('detecta estágio de preço quando usuário pergunta valor', async () => {
    const ctx = await buildBrainContext({ userInput: 'Quanto custa?' });

    expect(ctx.conversation_stage).toBe('preco');
    expect(ctx.best_response).not.toBeNull();
  });

  it('detecta objeção de preço alto', async () => {
    const ctx = await buildBrainContext({ userInput: 'Está caro demais' });

    expect(ctx.objection).not.toBeNull();
    expect(ctx.objection?.type).toBe('preco_alto');
  });

  it('não detecta estágio para mensagem genérica', async () => {
    const ctx = await buildBrainContext({ userInput: 'Olá, tudo bem?' });

    expect(ctx.conversation_stage).toBeNull();
    expect(ctx.objection).toBeNull();
  });

  it('detecta objeção de desconfiança', async () => {
    const ctx = await buildBrainContext({ userInput: 'É golpe?' });

    expect(ctx.objection).not.toBeNull();
    expect(ctx.objection?.type).toBe('desconfianca');
  });
});

describe('brainContextToSystemPrompt', () => {
  it('gera string de prompt não vazia para contexto válido', async () => {
    const ctx = await buildBrainContext({ userInput: 'Quanto é 1 hora?' });
    const prompt = brainContextToSystemPrompt(ctx);

    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('REGRAS:');
  });

  it('inclui estágio da conversa quando detectado', async () => {
    const ctx = await buildBrainContext({ userInput: 'Qual o valor?' });
    const prompt = brainContextToSystemPrompt(ctx);

    expect(prompt).toContain('ESTÁGIO DA CONVERSA: preco');
  });

  it('inclui objeção quando detectada', async () => {
    const ctx = await buildBrainContext({ userInput: 'Faz desconto?' });
    const prompt = brainContextToSystemPrompt(ctx);

    expect(prompt).toContain('OBJEÇÃO DETECTADA');
  });
});
