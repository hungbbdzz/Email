
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- 1. CẤU HÌNH DỮ LIỆU ---
let TRAINING_CORPUS = [];
const corpusPath = path.join(__dirname, 'training-corpus.json');

try {
    if (fs.existsSync(corpusPath)) {
        console.log(`📂 Reading training data from ${corpusPath}...`);
        const rawData = fs.readFileSync(corpusPath, 'utf-8');
        TRAINING_CORPUS = JSON.parse(rawData);
    } else {
        console.error(`❌ Error: File ${corpusPath} not found!`);
        process.exit(1);
    }
} catch (error) {
    console.error("❌ Error parsing JSON training data:", error.message);
    process.exit(1);
}

// --- 2. LOGIC XỬ LÝ (VSM) ---
const STOP_WORDS = new Set([
    // English Common
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'in', 'of', 'for', 'this', 'that', 'with', 'from', 'as', 'by', 'we', 'you', 'your', 'are', 'be', 'or', 'it', 'can', 'have', 'has', 'not', 'if', 'but', 'me', 'my', 'so', 'do', 'will', 'just', 'go', 'up', 'down', 'dear', 'hi', 'hello', 'best', 'regards', 'thanks', 'thank', 'am', 'pm', 'subject', 're', 'fwd', 'cc', 'bcc', 'sent', 'via',
    // Vietnamese Common
    'là', 'của', 'và', 'các', 'những', 'cho', 'với', 'trong', 'tại', 'để', 'do', 'bởi', 'vì', 'này', 'đó', 'khi', 'nhưng', 'hoặc', 'thì', 'mà', 'được', 'tôi', 'bạn', 'chúng', 'nó', 'về', 'gửi', 'kính', 'thân', 'như', 'có', 'làm', 'người', 'ra', 'vào', 'lại', 'qua', 'hãy', 'đã', 'đang', 'sẽ', 'ngày', 'tháng', 'năm',
    // Tech / HTML / CSS Noise (CRITICAL FOR EMAILS)
    'div', 'span', 'class', 'style', 'href', 'http', 'https', 'com', 'vn', 'www', 'font', 'color', 'size', 'face', 'align', 'target', 'blank', 'html', 'body', 'table', 'tr', 'td', 'br', 'img', 'src', 'strong', 'em', 'b', 'i', 'u', 'width', 'height', 'padding', 'margin', 'border', 'background', 'text', 'center', 'left', 'right', 'top', 'bottom', 'display', 'block', 'inline', 'none', 'sans-serif', 'arial', 'helvetica', 'solid', 'px', 'important', 'mailto', 'tel', 'fax', 'mobile'
]);

function tokenize(text) {
    if (!text || typeof text !== 'string') return [];

    // SAFETY: Truncate text to 100KB to prevent RangeError on massive spam/log emails
    // This is plenty for classification and prevents memory exhaustion.
    const MAX_LENGTH = 100000;
    let cleanText = text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text;

    // 1. Remove Script and Style blocks content entirely (CSS/JS noise)
    cleanText = cleanText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

    // 2. Remove HTML Tags
    cleanText = cleanText.replace(/<[^>]+>/g, ' ');

    // 3. Lowercase
    cleanText = cleanText.toLowerCase();

    // 4. Replace non-word characters with space
    cleanText = cleanText.replace(/[^\w\s\u00C0-\u1EF9]/g, ' ');

    // 5. Split and Filter
    const words = cleanText.split(/\s+/);
    const tokens = [];

    // Optimize loop
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

    // Limit bigram generation to first 2000 tokens to avoid n^2 issues in rare edge cases (though loop is linear)
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

function createWeightedVector(body, subject, sender, vocabulary, idfMap) {
    const vector = new Array(vocabulary.length).fill(0);
    const tfMap = new Map();

    const bodyTokens = tokenize(body || "");
    const subjectTokens = tokenize(subject || "");
    const senderTokens = tokenize(sender || "");

    const addToMap = (tokens, weight) => {
        tokens.forEach(t => {
            const current = tfMap.get(t) || 0;
            tfMap.set(t, current + weight);
        });
    };

    addToMap(bodyTokens, 1.0);
    addToMap(subjectTokens, 5.0); 
    addToMap(senderTokens, 10.0);

    const totalWeight = bodyTokens.length + (subjectTokens.length * 5) + (senderTokens.length * 10);

    vocabulary.forEach((term, index) => {
        if (tfMap.has(term)) {
            const rawCount = tfMap.get(term) || 0;
            const tf = rawCount / (totalWeight || 1);
            const idf = idfMap[term] || 0;
            vector[index] = tf * idf;
        }
    });

    return vector;
}

function calculateCentroid(vectors) {
    if (!vectors || vectors.length === 0) return [];
    const dims = vectors[0].length;
    const centroid = new Array(dims).fill(0);
    for (let i = 0; i < dims; i++) {
        let sum = 0;
        vectors.forEach(v => sum += v[i]);
        centroid[i] = sum / vectors.length;
    }
    return centroid;
}

// --- 3. MAIN PROCESS ---

const VALID_CORPUS = TRAINING_CORPUS.filter(item => {
    return item && typeof item === 'object' && (item.text || item.subject);
});

console.log(`🚀 Starting training with ${VALID_CORPUS.length} valid emails...`);

if (VALID_CORPUS.length === 0) {
    console.error("❌ No valid data found.");
    process.exit(1);
}

// 1. Build Vocabulary
console.log("Step 1: Building Vocabulary...");
const docs = [];
let skippedCount = 0;

for (const d of VALID_CORPUS) {
    try {
        const tokens = tokenize(`${d.subject || ''} ${d.sender || ''} ${d.text || ''}`);
        docs.push(tokens);
    } catch (e) {
        skippedCount++;
        if (skippedCount <= 3) {
            console.warn(`⚠️ Error tokenizing email: ${d.subject?.substring(0, 30)}... Error: ${e.message}`);
        }
    }
}

if (skippedCount > 0) {
    console.warn(`⚠️ Skipped ${skippedCount} problematic emails during tokenization.`);
}

const uniqueTokens = new Set();
docs.forEach(d => d.forEach(t => uniqueTokens.add(t)));

// Prune Vocabulary
const tokenCounts = new Map();
docs.forEach(d => d.forEach(t => tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1)));

// Filter rare words
const minCount = VALID_CORPUS.length > 100 ? 3 : 1; 
const vocabulary = Array.from(uniqueTokens).filter(t => (tokenCounts.get(t) || 0) >= minCount);

console.log(`Vocabulary size: ${vocabulary.length} words (Min frequency: ${minCount})`);

// 2. Calculate IDF
console.log("Step 2: Calculating IDF...");
const N = docs.length;
const idfMap = {};
vocabulary.forEach(term => {
    const docsWithTerm = docs.filter(d => d.includes(term)).length;
    idfMap[term] = Math.log10(N / (1 + docsWithTerm));
});

// 3. Vectorize & Centroids
console.log("Step 3: Vectorizing emails & calculating centroids...");
const vectors = [];
for(let i=0; i<VALID_CORPUS.length; i++) {
    try {
        const d = VALID_CORPUS[i];
        vectors.push({
            label: d.label || 'Unknown',
            vector: createWeightedVector(d.text || '', d.subject || '', d.sender || '', vocabulary, idfMap)
        });
    } catch (e) {
        // Skip problematic vectors
    }
}

const categories = Array.from(new Set(VALID_CORPUS.map(d => d.label).filter(Boolean)));
const categoryCentroids = {};

categories.forEach(cat => {
    const catVectors = vectors.filter(v => v.label === cat).map(v => v.vector);
    if (catVectors.length > 0) {
        categoryCentroids[cat] = calculateCentroid(catVectors);
    }
});

// --- 4. SAVE TO FILE ---
const outputData = {
    vocabulary,
    idf: idfMap,
    centroids: categoryCentroids
};

const outputPath = path.join(__dirname, 'src', 'services', 'trainedModel.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

// Verify write
const writtenStats = fs.statSync(outputPath);
console.log(`✅ Model saved to ${outputPath}`);
console.log(`📊 File Size: ${(writtenStats.size / 1024).toFixed(2)} KB`);
console.log(`📈 Stats: ${categories.length} categories, ${vocabulary.length} vocabulary size.`);