
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Email, EmailLabel, UserProfile, Message, ChatSession } from '../types';
import { vsmService } from './vsmService'; 

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  try {
    new URL(supabaseUrl);
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Invalid Supabase URL:", error);
  }
}

export { supabase };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Encode string to Base64URL (safe for Gmail API)
const encodeBase64Url = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Helper: Encode binary data to Base64 (for attachments)
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// --- User Profile Sync ---
export const updateUserProfile = async (user: UserProfile) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      updated_at: new Date().toISOString()
    });
    if (error) console.error("Error syncing profile:", error);
  } catch (e) {
    console.error("Profile sync exception:", e);
  }
};

// --- CHAT PERSISTENCE ---

export const createChatSession = async (userId: string, title: string, type: 'dm'|'space' = 'dm', members: string[] = []) => {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ 
        user_id: userId, 
        title: title
    })
    .select()
    .single();
  
  if (error) {
    console.error("Create chat session error:", error);
    return null;
  }
  
  // Patch local return object with members for UI
  return { ...data, type, members } as ChatSession;
};

export const getChatSessions = async (userId: string) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Get chat sessions error:", error);
    return [];
  }
  
  // Infer type: if title exists and looks like a name, it's a space, otherwise DM
  return data.map((d: any) => ({
      ...d,
      type: d.title && !d.title.includes('...') ? 'space' : 'dm', // Heuristic
      members: [] // fetch members if real relation exists
  }));
};

export const deleteChatSession = async (sessionId: string) => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);
  
  if (error) {
    console.error("Delete session error:", error);
    return false;
  }
  return true;
};

export const getChatMessages = async (sessionId: string): Promise<Message[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Get messages error:", error);
    return [];
  }

  // Convert to app Message type
  return data.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    text: msg.text,
    timestamp: new Date(msg.created_at).getTime()
  }));
};

export const saveChatMessage = async (sessionId: string, role: 'user' | 'model', text: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role, text })
    .select()
    .single();

  // Also update session updated_at
  await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);

  if (error) {
    console.error("Save message error:", error);
    return null;
  }
  return data;
};


// --- Gmail API Actions ---

export interface SendEmailParams {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string; // HTML supported
    attachments?: File[];
    threadId?: string;
}

export const sendGmailMessage = async (accessToken: string, params: SendEmailParams) => {
  try {
    const boundary = "foo_bar_baz_" + Date.now();
    const nl = "\r\n";
    
    let messageParts = [];
    
    // 1. Headers
    messageParts.push(`To: ${params.to}`);
    if (params.cc) messageParts.push(`Cc: ${params.cc}`);
    if (params.bcc) messageParts.push(`Bcc: ${params.bcc}`);
    
    // Encode Subject properly for UTF-8
    const encodedSubject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;
    messageParts.push(`Subject: ${encodedSubject}`);
    
    messageParts.push("MIME-Version: 1.0");
    messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    messageParts.push(nl);

    // 2. Body (HTML)
    messageParts.push(`--${boundary}`);
    messageParts.push("Content-Type: text/html; charset=UTF-8");
    messageParts.push("Content-Transfer-Encoding: base64");
    messageParts.push(nl);
    messageParts.push(btoa(unescape(encodeURIComponent(params.body || ""))));
    messageParts.push(nl);

    // 3. Attachments
    if (params.attachments && params.attachments.length > 0) {
        for (const file of params.attachments) {
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = arrayBufferToBase64(arrayBuffer);
            
            messageParts.push(`--${boundary}`);
            messageParts.push(`Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"`);
            messageParts.push(`Content-Disposition: attachment; filename="${file.name}"`);
            messageParts.push("Content-Transfer-Encoding: base64");
            messageParts.push(nl);
            messageParts.push(base64Data); 
            messageParts.push(nl);
        }
    }

    messageParts.push(`--${boundary}--`);

    const rawMessage = messageParts.join(nl);
    
    // Gmail requires URL-safe Base64 for the 'raw' field
    const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const payload: any = { raw: encodedMessage };
    if (params.threadId) payload.threadId = params.threadId;

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to send email: ${errText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Send Email Error:", error);
    throw error;
  }
};

export const toggleGmailStar = async (accessToken: string, messageId: string, isStarred: boolean) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
    const body = {
      addLabelIds: isStarred ? [] : ['STARRED'],
      removeLabelIds: isStarred ? ['STARRED'] : []
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
        const txt = await res.text();
        console.warn(`Toggle Star API Error (${res.status}): ${txt}`);
    }
  } catch (error) { console.error("Toggle Star Error:", error); }
};

export const trashGmailMessage = async (accessToken: string, messageId: string) => {
   try {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) {
        console.warn(`Trash API non-200: ${res.status}`);
    }
  } catch (error) { console.error("Trash Email Error:", error); }
};

export const deleteGmailMessage = async (accessToken: string, messageId: string) => {
  try {
   const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
     method: 'DELETE',
     headers: { 'Authorization': `Bearer ${accessToken}` }
   });
   if (!res.ok) {
       console.warn(`Permanent Delete API non-200: ${res.status}`);
   }
 } catch (error) { console.error("Permanent Delete Email Error:", error); }
};

// --- BATCH FETCHING ---
const fetchInBatches = async <T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(item => fn(item).catch(e => {
                console.warn("Item fetch failed in batch", e);
                return null;
            }))
        );
        batchResults.forEach(r => { if (r) results.push(r); });
        if (i + batchSize < items.length) await delay(250);
    }
    return results;
};

export const fetchGmailWithToken = async (
    accessToken: string, 
    maxResults = 50,
    onProgress?: (current: number, total: number) => void
): Promise<Email[]> => {
  try {
    let allMessages: any[] = [];
    let nextPageToken = '';
    let hasMore = true;
    
    // If maxResults is -1, treat as unlimited (fetch all)
    // Otherwise use it as a limit
    const isUnlimited = maxResults === -1;
    const fetchLimit = isUnlimited ? 999999 : maxResults;
    const batchSize = 100; // Gmail API max per page is approx 500, but let's be safe

    // 1. Fetch Message List (ID List)
    do {
       // Request what we need, capped at batchSize per request
       const currentMax = isUnlimited ? batchSize : Math.min(batchSize, fetchLimit - allMessages.length);
       if (currentMax <= 0) break;

       let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${currentMax}`;
       if (nextPageToken) url += `&pageToken=${nextPageToken}`;

       const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
       
       if (listRes.status === 401) throw new Error("Unauthorized: Token expired");
       if (!listRes.ok) throw new Error(`List messages failed: ${listRes.status}`);
       
       const listData = await listRes.json();
       
       if (listData.messages && listData.messages.length > 0) {
           allMessages = [...allMessages, ...listData.messages];
       }

       nextPageToken = listData.nextPageToken;
       
       // Stop if no more pages OR we reached our limit (if not unlimited)
       if (!nextPageToken || (!isUnlimited && allMessages.length >= fetchLimit)) {
           hasMore = false;
       }
       
       if (onProgress && isUnlimited) {
           // Provide intermediate feedback during listing phase
           onProgress(0, allMessages.length); 
       }

    } while (hasMore);

    if (allMessages.length === 0) return [];

    // 2. Fetch Details in Batches
    const total = allMessages.length;
    let processedCount = 0;
    if (onProgress) onProgress(0, total);

    const emails = await fetchInBatches(allMessages, 10, async (msg: any) => { // Batch 10 concurrent requests
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, { 
            headers: { Authorization: `Bearer ${accessToken}` } 
        });
        
        processedCount++;
        if (onProgress) onProgress(processedCount, total);
        
        if (!detailRes.ok) {
            if (detailRes.status === 429) {
                console.warn(`Rate limit hit for msg ${msg.id}, waiting...`);
                await delay(1000); // Simple backoff
                return null; // Skip for now to keep moving
            }
            throw new Error(`Failed to fetch detail for ${msg.id}`);
        }
        
        const detail = await detailRes.json();
        return transformGmailToAppEmail(detail);
    });

    return emails;
  } catch (error) {
    console.error("Gmail Fetch Error", error);
    return [];
  }
};

export const stripHtml = (html: string): string => {
  if (!html) return "";
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, ""); 

  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    text = doc.body.textContent || "";
  } catch (e) {
    text = text.replace(/<[^>]+>/g, " ");
  }
  return text.replace(/\s+/g, " ").trim();
};

export const summarizeEmailLocal = (content: string): string => {
  if (!content) return "No content.";
  const cleanText = stripHtml(content);
  const summary = cleanText.substring(0, 150);
  return summary.length < cleanText.length ? summary + '...' : summary;
};

// --- Decoding Helpers ---

const decodeMimeHeader = (headerValue: string): string => {
    if (!headerValue) return "";
    return headerValue.replace(/=\?([a-zA-Z0-9\-]+)\?([BQbq])\?([a-zA-Z0-9+/=]+)\?=/g, (match, charset, encoding, text) => {
        if (encoding.toUpperCase() === 'B') {
            try {
                return decodeURIComponent(escape(atob(text)));
            } catch (e) { return text; }
        }
        // Simplified Q-encoding handler
        if (encoding.toUpperCase() === 'Q') {
            return text.replace(/_/g, ' ');
        }
        return text;
    });
};

const decodeGmailBody = (data: string): string => {
    if (!data) return "";
    try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
        console.warn("Decode failed, trying TextDecoder fallback");
        try {
            const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch(e2) {
             return data; // Return raw as fallback
        }
    }
};

const transformGmailToAppEmail = (gmailMessage: any): Email => {
  if (!gmailMessage || !gmailMessage.payload || !gmailMessage.payload.headers) {
      throw new Error("Invalid message structure");
  }

  const headers = gmailMessage.payload.headers;
  const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';
  
  const rawFrom = getHeader('From');
  const rawSubject = getHeader('Subject');
  
  // Use new decoder
  const decodedSubject = decodeMimeHeader(rawSubject) || '(No Subject)';
  const decodedFrom = decodeMimeHeader(rawFrom);

  const fromMatch = decodedFrom.match(/(.*)<(.*)>/);
  
  const snippet = gmailMessage.snippet ? stripHtml(gmailMessage.snippet) : "";

  let body = "";
  if (gmailMessage.payload.body && gmailMessage.payload.body.data) {
      body = decodeGmailBody(gmailMessage.payload.body.data);
  } else if (gmailMessage.payload.parts) {
      // Prioritize HTML, then Plain Text
      const htmlPart = gmailMessage.payload.parts.find((p: any) => p.mimeType === 'text/html');
      const textPart = gmailMessage.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      
      if (htmlPart && htmlPart.body && htmlPart.body.data) {
          body = decodeGmailBody(htmlPart.body.data);
      } else if (textPart && textPart.body && textPart.body.data) {
          body = decodeGmailBody(textPart.body.data);
      } else {
          // Recursive search
          const findBody = (parts: any[]): string | null => {
              for (const p of parts) {
                  if (p.mimeType === 'text/html' && p.body?.data) return decodeGmailBody(p.body.data);
                  if (p.mimeType === 'text/plain' && p.body?.data) return decodeGmailBody(p.body.data);
                  if (p.parts) {
                      const found = findBody(p.parts);
                      if (found) return found;
                  }
              }
              return null;
          };
          body = findBody(gmailMessage.payload.parts) || snippet;
      }
  }

  const previewText = snippet && snippet.length > 5 ? 
    (snippet.length > 150 ? snippet.substring(0, 150) + '...' : snippet) : 
    summarizeEmailLocal(body);

  const initialLabel = vsmService.classify(
      decodedSubject, 
      snippet, 
      fromMatch ? fromMatch[1] : decodedFrom
  );

  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId, // Capture Thread ID
    senderName: fromMatch ? fromMatch[1].trim().replace(/"/g, '') : decodedFrom,
    senderEmail: fromMatch ? fromMatch[2].trim() : '',
    subject: decodedSubject,
    preview: previewText,
    body: body || snippet || "", 
    date: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
    label: initialLabel.label as EmailLabel, 
    confidenceScore: initialLabel.score,
    isRead: !gmailMessage.labelIds.includes('UNREAD'),
    isStarred: gmailMessage.labelIds.includes('STARRED'),
    warnings: [],
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fromMatch ? fromMatch[1] : decodedFrom)}&background=random`
  };
};

export const markEmailAsRead = async (emailId: string) => {
  if (supabase) await supabase.from('emails').update({ is_read: true }).eq('id', emailId);
};

export const updateEmailStarStatus = async (emailId: string, isStarred: boolean) => {
  if (supabase) await supabase.from('emails').update({ is_starred: isStarred }).eq('id', emailId);
};

let learningContext: { text: string; label: EmailLabel }[] = []; 

export const classifyAndSyncEmails = async (emails: Email[], userId: string, addModelLog: (action: string, details: string, status: string) => void) => {
  if (!supabase || !userId) return;

  addModelLog('Vector Space Model', `Processed ${emails.length} emails.`, 'Success');

  try {
    const upsertData = emails.map(e => ({
        id: e.id,
        user_id: userId, 
        sender_name: e.senderName,
        sender_email: e.senderEmail,
        subject: e.subject,
        preview: e.preview,
        body: e.body,
        date: e.date,
        label: e.label,
        confidence_score: e.confidenceScore,
        is_read: e.isRead,
        is_starred: e.isStarred,
        warnings: e.warnings || [],
        is_correction: false
        // threadId should also be saved to DB ideally, but for now we keep it client-side synced if structure doesn't support
    }));

    const { error } = await supabase.from('emails').upsert(upsertData, { onConflict: 'id' });
    
    if (error) {
      console.error("Supabase Upsert Error:", error.message);
      addModelLog('Supabase Upsert', error.message, 'Error');
    }
  } catch (err: any) {
    console.error("DB Sync Exception:", err);
    addModelLog('DB Sync', err.message, 'Error');
  }
};

export const learnFromCorrection = async (email: Email, newLabel: EmailLabel, addModelLog: (action: string, details: string, status: string) => void) => {
  learningContext.push({ text: `${email.subject}`, label: newLabel });
  if (supabase) {
    await supabase.from('emails').update({ label: newLabel, is_correction: true }).eq('id', email.id);
    addModelLog('Manual Correction', `Email ${email.id} corrected to ${newLabel}`, 'Success');
  }
};

export const subscribeToEmails = (userId: string, onInsert: (email: Email) => void, onUpdate: (email: Email) => void, onDelete?: (id: string) => void) => {
  if (!supabase || !userId) return null;
  const filter = `user_id=eq.${userId}`;
  return supabase.channel(`emails_sub_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emails', filter: filter }, (payload) => {
        const d = payload.new as any;
        onInsert(mapDbToEmail(d));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emails', filter: filter }, (payload) => {
        const d = payload.new as any;
        onUpdate(mapDbToEmail(d));
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'emails', filter: filter }, (payload) => {
      if (onDelete && payload.old && (payload.old as any).id) {
          onDelete((payload.old as any).id);
      }
    })
    .subscribe();
};

const mapDbToEmail = (d: any): Email => ({
    id: d.id,
    threadId: d.threadId, // Ensure mapped if exists in DB or just undefined
    senderName: d.sender_name,
    senderEmail: d.sender_email,
    subject: d.subject,
    preview: d.preview,
    body: d.body,
    date: d.date,
    label: d.label as EmailLabel,
    confidenceScore: d.confidence_score,
    isRead: d.is_read,
    isStarred: d.is_starred,
    isArchived: d.is_archived,
    isDeleted: d.is_deleted,
    warnings: d.warnings,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.sender_name)}&background=random`
});

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  window.location.reload();
};