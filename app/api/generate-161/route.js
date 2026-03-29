import { GoogleGenAI } from '@google/genai';

// গুগল এর দেওয়া নতুন নিয়মে ক্লায়েন্ট তৈরি
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const { report, note } = body;

    if (!report) {
      return new Response(JSON.stringify({ error: "কোনো রিপোর্ট দেওয়া হয়নি" }), { status: 400 });
    }

    // আপনার সেই শক্তিশালী মাস্টার প্রম্পট (এক অক্ষরও বদলানো হয়নি)
    const rawPrompt = `
ভূমিকা: তুমি পিবিআই (PBI)-এর একজন অত্যন্ত অভিজ্ঞ, পেশাদার এবং ধুরন্ধর তদন্তকারী কর্মকর্তা।

🚨 **কঠোর আইনি বাধ্যবাধকতা (Strict Rules - Must Follow):**
১. 'আসামী' শব্দ ব্যবহার সম্পূর্ণ নিষিদ্ধ। মূল প্রতিবেদনে আসামী লেখা থাকলেও তুমি সব জায়গায় 'বিবাদী' লিখবে।
২. মূল প্রতিবেদনের "সাক্ষীর নাম ও ঠিকানা" কলামে যতজন সাক্ষীর নাম আছে, গুনে গুনে ঠিক ততজনেরই ১৬১ জবানবন্দি তৈরি করবে। ৪ জন থাকলে ৪ জনেরই দিতে হবে, কেউ যেন বাদ না পড়ে।
৩. বাদী বা বাদিনীর ১৬১ জবানবন্দি কোনোভাবেই তৈরি করবে না (যদি না আইও নোটে আলাদাভাবে বাদী/বাদিনীর নাম উল্লেখ করে দিতে বলা হয়)।
৪. নিজে থেকে মনগড়া কোনো সাক্ষীর নাম বা তথ্য বানাবে না।

🚨 **আইও নোট (IO Note) - সর্বোচ্চ অগ্রাধিকার:** "${note || 'প্রতিবেদনের "সাক্ষীর নাম ও ঠিকানা" কলাম থেকে সকল সাক্ষীর জবানবন্দি তৈরি করো। কেউ যেন বাদ না পড়ে।'}"

📄 **মূল তদন্ত প্রতিবেদন:**
${report}

⚠️ **জবানবন্দি তৈরির নিয়মকানুন ও ফরমেট:**
১. **ছাঁচ (Structure):** প্রতিটি জবানবন্দি নির্দিষ্ট ছাঁচে (সূত্রঃ-, সংক্রান্তে সাক্ষী...) লিখতে হবে।
২. **বাস্তবসম্মত বক্তব্য:** সব সাক্ষী এক কথা বলবে না। 
৩. **আউটপুট ফরমেট:** অবশ্যই শুদ্ধ HTML ট্যাগ (যেমন <p>, <b>) ব্যবহার করে দেবে। কোনো কোড ব্লক (\`\`\`html) দেবে না।
    `;

    // গুগলের দেওয়া নতুন মডেল আইডি ও স্ট্রিমিং মেথড
    const response = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
      contents: [{ role: 'user', parts: [{ text: rawPrompt }] }],
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // গুগল এর দেওয়া সেই নতুন লুপ: for await (const chunk of response)
          for await (const chunk of response) {
            const chunkText = chunk.text; // নতুন লাইব্রেরিতে সরাসরি .text থাকে
            if (chunkText) {
              // HTML ক্লিনআপ (যাতে টেক্সট বক্সে সুন্দর দেখায়)
              let cleanChunk = chunkText
                .replace(/```html/gi, "")
                .replace(/```/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/[\n\r]/g, "");

              controller.enqueue(new TextEncoder().encode(cleanChunk));
            }
          }
        } catch (streamError) {
          console.error("Stream Error:", streamError);
          controller.enqueue(new TextEncoder().encode("<br><b>⚠️ জেনারেশন মাঝপথে বন্ধ হয়ে গেছে।</b>"));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("Fatal API Error:", error);
    return new Response(JSON.stringify({ error: "১৬১ তৈরিতে সমস্যা হয়েছে।" }), { status: 500 });
  }
}