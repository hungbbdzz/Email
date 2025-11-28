import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType } from "../types";

// Initialize the client.
// The define plugin in vite.config.ts replaces process.env.API_KEY with the string literal.
// We use process.env.API_KEY directly as per guidelines.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTextResponse = async (
  prompt: string,
  model: string = ModelType.FLASH_2_0 // Default to Gemini 2.0 Flash
): Promise<string> => {
  try {
    if (!process.env.API_KEY) throw new Error("API Key not found");
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "No response text generated.";
  } catch (error: any) {
    console.error("Error generating text:", error);
    return "I'm sorry, but I cannot process your request at the moment due to a configuration issue.";
  }
};

export const generateImageAnalysis = async (
  imageBase64: string,
  prompt: string,
  mimeType: string = "image/png"
): Promise<string> => {
  try {
    if (!process.env.API_KEY) throw new Error("API Key not found");

    // Vision tasks often perform best with Flash 2.0 or Pro
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: ModelType.FLASH_2_0,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Unable to analyze image.";
  }
};

export const generateEmailAutocomplete = async (
    subject: string,
    to: string,
    currentBody: string
): Promise<string> => {
    try {
        if (!process.env.API_KEY) return "";
        
        // Don't autocomplete if too short
        if (currentBody.length < 5) return "";

        const prompt = `
        You are an intelligent email writing assistant. 
        Context:
        - To: ${to}
        - Subject: ${subject}
        - Current Body: "${currentBody}"

        Task: Provide a SHORT completion (1 sentence max) for the current email body. 
        If the sentence is complete, suggest the next logical sentence.
        Do NOT repeat the current body. Just provide the continuation text.
        If the context is Vietnamese, suggest in Vietnamese.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: ModelType.FLASH_2_0,
            contents: prompt,
            config: {
                maxOutputTokens: 30, // Keep it short
                temperature: 0.3 // Keep it focused
            }
        });
        
        return response.text ? response.text.trim() : "";
    } catch (e) {
        console.warn("Autocomplete failed", e);
        return "";
    }
};