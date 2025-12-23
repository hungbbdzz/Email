
// VSM Backend Simulation Service
// Implements Chapter 11: Vector Space Model & Spam Email Detection
// Upgrades: Bigrams, Field Weighting, TF-IDF, Cosine Similarity, Advanced Tokenization

import { Email, TrainingData } from '../types';
import rawModelData from './trainedModel.json'; // Load pre-trained model

// Explicitly type the JSON data
const modelData = rawModelData as {
    vocabulary: string[];
    idf: Record<string, number>;
    centroids: Record<string, number[]>;
};

const STOP_WORDS = new Set([
    // English Common
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'in', 'of', 'for', 'this', 'that', 'with', 'from', 'as', 'by', 'we', 'you', 'your', 'are', 'be', 'or', 'it', 'can', 'have', 'has', 'not', 'if', 'but', 'me', 'my', 'so', 'do', 'will', 'just', 'go', 'up', 'down', 'dear', 'hi', 'hello', 'best', 'regards', 'thanks', 'thank', 'am', 'pm', 'subject', 're', 'fwd', 'cc', 'bcc', 'sent', 'via',
    // Vietnamese Common
    'là', 'của', 'và', 'các', 'những', 'cho', 'với', 'trong', 'tại', 'để', 'do', 'bởi', 'vì', 'này', 'đó', 'khi', 'nhưng', 'hoặc', 'thì', 'mà', 'được', 'tôi', 'bạn', 'chúng', 'nó', 'về', 'gửi', 'kính', 'thân', 'như', 'có', 'làm', 'người', 'ra', 'vào', 'lại', 'qua', 'hãy', 'đã', 'đang', 'sẽ', 'ngày', 'tháng', 'năm',
    // Tech / HTML / CSS Noise (CRITICAL FOR EMAILS)
    'div', 'span', 'class', 'style', 'href', 'http', 'https', 'com', 'vn', 'www', 'font', 'color', 'size', 'face', 'align', 'target', 'blank', 'html', 'body', 'table', 'tr', 'td', 'br', 'img', 'src', 'strong', 'em', 'b', 'i', 'u', 'width', 'height', 'padding', 'margin', 'border', 'background', 'text', 'center', 'left', 'right', 'top', 'bottom', 'display', 'block', 'inline', 'none', 'sans-serif', 'arial', 'helvetica', 'solid', 'px', 'important', 'mailto', 'tel', 'fax', 'mobile'
]);

export class VectorSpaceService {
    private vocabulary: string[] = [];
    private idfMap: Map<string, number> = new Map();
    private categoryCentroids: Map<string, number[]> = new Map();
    private isTrained: boolean = false;
    
    private dynamicCorpus: TrainingData[] = [];

    constructor() {
        this.hydrateModel();
    }

    private hydrateModel() {
        if (modelData && modelData.vocabulary && modelData.vocabulary.length > 0) {
            try {
                this.vocabulary = modelData.vocabulary;
                this.idfMap = new Map(Object.entries(modelData.idf));
                this.categoryCentroids = new Map(
                    Object.entries(modelData.centroids).map(([k, v]) => [k, v as number[]])
                );
                this.isTrained = true;
                console.log(`[VSM] Loaded pre-trained model with ${this.vocabulary.length} dimensions.`);
            } catch (e) {
                console.error("Failed to hydrate model, falling back to runtime training", e);
                this.isTrained = false;
            }
        }
    }

    public learnFromUserEmails(emails: Email[]) {
        const newTrainingData: TrainingData[] = emails
            .filter(e => e.label && e.body && e.body.length > 20)
            .map(e => ({
                text: e.body,
                label: e.label,
                sender: e.senderEmail,
                subject: e.subject
            }));

        if (newTrainingData.length > 0) {
            this.dynamicCorpus = newTrainingData;
            // Delay retaining to avoid UI jank
            setTimeout(() => this.trainModel(), 1000); 
        }
    }

    private tokenize(text: string): string[] {
        if (!text) return []; 
        
        // SAFETY: Truncate text to 100KB to prevent freezing/crashing on client
        const MAX_LENGTH = 100000;
        let cleanText = text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text;

        cleanText = cleanText
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .toLowerCase()
            .replace(/[^\w\s\u00C0-\u1EF9]/g, ' '); 

        const words = cleanText.split(/\s+/);
        const tokens: string[] = [];

        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (
                w.length > 2 && 
                w.length < 20 && 
                !STOP_WORDS.has(w) && 
                !/\d/.test(w) && 
                !w.startsWith('_')
            ) {
                tokens.push(w);
            }
        }

        const bigramLimit = Math.min(tokens.length - 1, 2000);
        for (let i = 0; i < bigramLimit; i++) {
            const w1 = tokens[i];
            const w2 = tokens[i+1];
            if (w1.length > 3 && w2.length > 3) {
                tokens.push(`${w1}_${w2}`);
            }
        }

        return tokens;
    }

    private trainModel() {
        let fullCorpus = this.dynamicCorpus;
        if (fullCorpus.length === 0) {
            this.isTrained = true;
            return;
        }

        // Vectorize dynamic data using EXISTING vocabulary (do not expand vocab to keep stability)
        const vectors = fullCorpus.map((d) => ({
            label: d.label,
            vector: this.createWeightedVector(d.text || '', d.subject || '', d.sender || '') 
        }));

        const categories = Array.from(new Set(fullCorpus.map(d => d.label).filter(Boolean)));
        
        categories.forEach(cat => {
            const catVectors = vectors.filter(v => v.label === cat).map(v => v.vector);
            if (catVectors.length > 0) {
                const newCentroid = this.calculateCentroid(catVectors);
                const existingCentroid = this.categoryCentroids.get(cat);
                
                if (existingCentroid) {
                    // Update centroid with a learning rate (0.2 for new data)
                    const blended = existingCentroid.map((val, i) => (val * 0.8) + ((newCentroid[i] || 0) * 0.2));
                    this.categoryCentroids.set(cat, blended);
                } else {
                    this.categoryCentroids.set(cat, newCentroid);
                }
            }
        });

        this.isTrained = true;
    }

    private createWeightedVector(body: string, subject: string, sender: string): number[] {
        const vector = new Array(this.vocabulary.length).fill(0);
        const tfMap = new Map<string, number>();

        const bodyTokens = this.tokenize(body || '');
        const subjectTokens = this.tokenize(subject || '');
        const senderTokens = this.tokenize(sender || ''); 

        const addToMap = (tokens: string[], weight: number) => {
            tokens.forEach(t => {
                const current = tfMap.get(t) || 0;
                tfMap.set(t, current + weight);
            });
        };

        addToMap(bodyTokens, 1.0);
        addToMap(subjectTokens, 5.0); // Higher weight for subject
        addToMap(senderTokens, 10.0); // Highest weight for sender

        const totalWeight = bodyTokens.length + (subjectTokens.length * 5) + (senderTokens.length * 10);

        this.vocabulary.forEach((term, index) => {
            if (tfMap.has(term)) {
                const rawCount = tfMap.get(term) || 0;
                const tf = rawCount / (totalWeight || 1); 
                const idf = this.idfMap.get(term) || 0;
                vector[index] = tf * idf;
            }
        });

        return vector;
    }

    private calculateCentroid(vectors: number[][]): number[] {
        const dims = this.vocabulary.length;
        const centroid = new Array(dims).fill(0);
        const validVectors = vectors.filter(v => v.length === dims);
        if(validVectors.length === 0) return centroid;

        for (let i = 0; i < dims; i++) {
            let sum = 0;
            validVectors.forEach(v => sum += v[i]);
            centroid[i] = sum / validVectors.length;
        }
        return centroid;
    }

    private cosineSimilarity(v1: number[], v2: number[]): number {
        if (v1.length !== v2.length) return 0;
        let dot = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            mag1 += v1[i] * v1[i];
            mag2 += v2[i] * v2[i];
        }
        const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
        return mag === 0 ? 0 : dot / mag;
    }

    public classify(subject: string, sender: string, body: string): { label: string, score: number } {
        if (!this.isTrained) this.trainModel();

        const inputVector = this.createWeightedVector(body || '', subject || '', sender || '');

        let bestLabel = 'Work'; 
        let bestScore = -1;
        
        this.categoryCentroids.forEach((centroid, label) => {
            const score = this.cosineSimilarity(inputVector, centroid);
            if (score > bestScore) {
                bestScore = score;
                bestLabel = label;
            }
        });

        // Minimum Confidence Threshold
        // If similarity is too low, default to 'Work' or 'Personal' based on heuristics
        if (bestScore < 0.05) {
             const senderLower = (sender || '').toLowerCase();
             // Simple fallback heuristics
             if (senderLower.includes('no-reply') || senderLower.includes('info') || senderLower.includes('newsletter')) {
                 bestLabel = 'Promotion';
             } else {
                 bestLabel = 'Work';
             }
        }

        return { label: bestLabel, score: bestScore };
    }
}

export const vsmService = new VectorSpaceService();