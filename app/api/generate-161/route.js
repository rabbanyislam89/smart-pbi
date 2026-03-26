import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const { report, note } = body;

    if (!report) {
      return new Response(JSON.stringify({ error: "কোনো রিপোর্ট দেওয়া হয়নি" }), { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const rawPrompt = `
ভূমিকা: তুমি পিবিআই (PBI)-এর একজন অত্যন্ত অভিজ্ঞ তদন্তকারী কর্মকর্তা।
কাজ: নিচে দেওয়া 'মূল তদন্ত প্রতিবেদন' এবং 'অফিসারের নোট (IO Note)' এর ওপর ভিত্তি করে ফৌঃ কাঃ বিঃ ১৬১ ধারার জবানবন্দি তৈরি করো।

অফিসারের নোট: "${note || 'যে সাক্ষীদের জবানবন্দি নেওয়া প্রয়োজন, তাদের জবানবন্দি নিখুঁতভাবে তৈরি করো।'}"

মূল তদন্ত প্রতিবেদন:
${report}

নির্দেশনা:
১. প্রমিত চলিত ভাষায় লিখবে।
২. পেশাদার আইনি শব্দ ব্যবহার করবে।
৩. আউটপুট অবশ্যই HTML ট্যাগ (যেমন <p>, <b>) ব্যবহার করে দেবে, কোনো কোড ব্লক (\`\`\`html) দেবে না।
    `;

    const cleanPrompt = rawPrompt.replace(/\u00A0/g, " ");
    const result = await model.generateContentStream(cleanPrompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            
            // 🔥 MS Word এ লেখা ভাঙা রোধ করতে সব লুকানো স্পেস ও এন্টার রিমুভ করা হলো
            let cleanChunk = chunkText
              .replace(/```html/gi, "")
              .replace(/```/g, "")
              .replace(/&nbsp;/gi, " ")
              .replace(/[\n\r]/g, "") 
              .replace(/[\u200B\uFEFF\u00AD]/g, "");

            if (cleanChunk) {
              controller.enqueue(new TextEncoder().encode(cleanChunk));
            }
          }
        } catch (e) {
          console.error("Stream parsing error:", e);
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
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "১৬১ তৈরিতে সমস্যা হয়েছে।" }), { status: 500 });
  }
}