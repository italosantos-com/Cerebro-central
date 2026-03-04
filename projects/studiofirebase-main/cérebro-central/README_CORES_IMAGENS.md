# Painel de Cores e Gerenciamento de Imagens

## Visão Geral

Este documento descreve a nova funcionalidade adicionada ao Cérebro Central para permitir o acesso ao painel de cores e gerenciamento de imagens através de comandos e interface administrativa.

## Funcionalidades Adicionadas

### 1. Microsserviços

Três novos microsserviços foram adicionados em `services/microservices.ts`:

#### `changePageColor(colorType, colorValue)`
- **Descrição**: Altera dinamicamente as cores do tema da página
- **Parâmetros**:
  - `colorType`: Tipo de cor (velvet-red, velvet-black, velvet-dark, velvet-card, velvet-red-hover)
  - `colorValue`: Valor hexadecimal da cor (ex: #e11d48)
- **Retorno**: ServiceResponse com sucesso/falha
- **Exemplo**: `Microservices.changePageColor('velvet-red', '#7c3aed')`

#### `uploadImage(source, sourceType)`
- **Descrição**: Carrega uma imagem via URL ou upload de arquivo
- **Parâmetros**:
  - `source`: URL da imagem ou caminho do arquivo
  - `sourceType`: 'url' ou 'file'
- **Retorno**: ServiceResponse com URL da imagem carregada
- **Exemplo**: `Microservices.uploadImage('https://exemplo.com/imagem.jpg', 'url')`

#### `changeBackgroundImage(imageUrl)`
- **Descrição**: Define uma imagem como fundo da página
- **Parâmetros**:
  - `imageUrl`: URL da imagem a ser usada como fundo
- **Retorno**: ServiceResponse com sucesso/falha
- **Exemplo**: `Microservices.changeBackgroundImage('https://exemplo.com/fundo.jpg')`

### 2. Painel de Cores e Imagens

Um novo componente `ColorPanel.tsx` foi criado com as seguintes funcionalidades:

#### Gerenciamento de Cores
- Seletor de tipo de cor (5 tipos disponíveis)
- Color picker nativo do navegador
- Input manual de código hexadecimal
- 6 cores predefinidas:
  - Vermelho Veludo (#e11d48)
  - Roxo Profundo (#7c3aed)
  - Azul Noturno (#1e3a8a)
  - Verde Esmeralda (#059669)
  - Laranja Fogo (#ea580c)
  - Rosa Quente (#ec4899)

#### Gerenciamento de Imagens
- Duas formas de carregamento:
  1. **Via URL**: Cole o link da imagem
  2. **Upload de Arquivo**: Interface de drag & drop (simulado)
- Preview da imagem carregada
- Aplicação direta como imagem de fundo

### 3. Integração com Admin Panel

O painel administrativo foi atualizado para incluir uma nova aba:
- **Cores & Imagens**: Acesso completo ao ColorPanel
- Ícone: Palette
- Posicionamento: Quinta aba no menu de navegação

### 4. Suporte CSS Dinâmico

O arquivo `index.html` foi atualizado para suportar alterações dinâmicas de cores:

```css
:root {
  --color-velvet-black: #0a0a0a;
  --color-velvet-dark: #121212;
  --color-velvet-card: #1e1e1e;
  --color-velvet-red: #e11d48;
  --color-velvet-red-hover: #be123c;
  --background-image: none;
}
```

Essas variáveis CSS são modificadas dinamicamente pelos microsserviços, permitindo mudanças em tempo real sem recarregar a página.

## Como Usar

### Via Interface Administrativa

1. Acesse o Cérebro Central
2. Clique em "Serviços / Admin" na barra lateral
3. Selecione a aba "Cores & Imagens"
4. **Para alterar cores**:
   - Escolha o tipo de cor no dropdown
   - Selecione uma cor predefinida OU use o color picker/input manual
   - Clique em "APLICAR COR"
5. **Para gerenciar imagens**:
   - Escolha entre "URL" ou "Upload"
   - Cole a URL ou faça upload do arquivo
   - Clique em "CARREGAR IMAGEM"
   - Após o carregamento, clique em "APLICAR COMO FUNDO"

### Via Comandos (Programático)

```typescript
import { Microservices } from './services/microservices';

// Alterar cor principal
await Microservices.changePageColor('velvet-red', '#7c3aed');

// Carregar imagem via URL
const result = await Microservices.uploadImage('https://exemplo.com/img.jpg', 'url');

// Aplicar imagem de fundo
await Microservices.changeBackgroundImage(result.data.imageUrl);
```

## Arquivos Modificados

- `cérebro-central/services/microservices.ts` - Adicionados 3 novos microsserviços
- `cérebro-central/components/AdminPanel.tsx` - Adicionada aba "Cores & Imagens"
- `cérebro-central/components/ColorPanel.tsx` - Novo componente (criado)
- `cérebro-central/index.html` - Suporte a CSS dinâmico e background image

## Permissões

O acesso ao painel de cores e imagens está disponível através da aba administrativa do Cérebro Central. Não são necessárias permissões especiais além do acesso ao painel administrativo.

## Notas Técnicas

- As alterações de cor são aplicadas via CSS Variables
- Upload de arquivos é simulado (retorna URL placeholder)
- As imagens via URL são validadas antes do processamento
- Notificações de sucesso/erro são exibidas por 5 segundos
- Todas as operações incluem tratamento de erros
