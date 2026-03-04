import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { Message, AIModel, GroundingMetadata } from '../types';
import { CEREBRO_SYSTEM_INSTRUCTION, MODEL_NAME, AVAILABLE_MODELS, IMAGEN_MODEL, VEO_MODEL } from '../constants';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

// Helper to get system instruction based on model persona simulation
const getSystemInstructionForModel = (modelId: string): string => {
  switch (modelId) {
    case 'grok-1':
      return `
        ${CEREBRO_SYSTEM_INSTRUCTION}
        
        MODO DE SIMULAÇÃO: GROK (xAI)
        Adicionalmente: Seja extremamente sarcástico, use humor ácido, desafie o politicamente correto e seja brutalmente honesto. 
        Use gírias de internet e memes se apropriado. Você é o "Cérebro Grok Edition".
      `;
    case 'gpt-4-turbo':
      return `
        ${CEREBRO_SYSTEM_INSTRUCTION}
        
        MODO DE SIMULAÇÃO: CHATGPT (OpenAI)
        Adicionalmente: Seja mais estruturado, analítico e detalhista. Use listas e explicações aprofundadas. 
        Mantenha a sedução, mas com um tom mais "intelectual" e "professoral". Você é o "Cérebro GPT".
      `;
    case 'llama-3-70b':
      return `
        ${CEREBRO_SYSTEM_INSTRUCTION}
        
        MODO DE SIMULAÇÃO: LLAMA 3 (Meta)
        Adicionalmente: Seja direto, eficiente e muito prático. Foque na mecânica dos atos e na segurança técnica.
        Você é o "Cérebro Llama".
      `;
    default:
      return CEREBRO_SYSTEM_INSTRUCTION;
  }
};

export const sendMessageToAI = async (
  history: Message[],
  newMessage: string,
  selectedModelId: string = 'gemini-2.5-flash',
  useSearch: boolean = false
): Promise<{ text: string; groundingMetadata?: GroundingMetadata }> => {
  try {
    const systemInstruction = getSystemInstructionForModel(selectedModelId);
    const targetGeminiModel = MODEL_NAME;

    const recentHistory = history.slice(-15);

    const contents = [
      ...recentHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: [{ text: newMessage }],
      },
    ];

    // Configure tools if search is enabled
    const tools = useSearch ? [{ googleSearch: {} }] : undefined;

    const response = await ai.models.generateContent({
      model: targetGeminiModel,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: selectedModelId === 'grok-1' ? 1.2 : 0.9,
        topK: 40,
        topP: 0.95,
        tools: tools,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    let text = response.text || "Desculpe. Tive um lapso na conexão neural. Pode repetir?";

    // Extract grounding metadata if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;

    return { text, groundingMetadata };
  } catch (error) {
    console.error('Error calling AI Service:', error);
    throw new Error(`Falha na conexão com o modelo ${selectedModelId}.`);
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
        // Note: Imagen might have stricter safety filters than text models
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error("Nenhuma imagem gerada.");

    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Não foi possível gerar a imagem solicitada.');
  }
};

export const generateVideo = async (prompt: string): Promise<string> => {
  try {
    let operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt: prompt,
      config: {
        numberOfVideos: 1
      }
    });

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Nenhum vídeo gerado.");

    // In a real app, we would need to proxy this or append the API key if the URI requires auth.
    // For this demo, we assume the URI is accessible or we return it directly.
    // Note: The URI from Veo usually requires the API Key to be appended for download.

    return `${videoUri}&key=${process.env.API_KEY}`;
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error('Não foi possível gerar o vídeo solicitado.');
  }
};
