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

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    // 🔥 মাস্টার প্রম্পট: এআই-এর অলসতা ও ভুল ঠেকাতে কড়া লজিক
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

১. **ছাঁচ (Structure):** প্রতিটি জবানবন্দি নিচের নির্দিষ্ট ছাঁচে লিখতে হবে:
<p><b>সূত্রঃ-</b> [মামলার ধরন ও নম্বর (যেমন: সিআর মামলা নং-..., ধারা-...) - প্রতিবেদন থেকে খুঁজে বের করো]</p>
<p>সংক্রান্তে সাক্ষী [সাক্ষীর নাম] ([বয়স, যদি থাকে]), [পিতা/স্বামী]- [নাম], সাং- [গ্রাম/এলাকা], থানা ও জেলা- [থানা ও জেলার নাম] এর প্রদত্ত মৌখিক বিবৃতি কা: বি: ১৬১ ধারা মোতাবেক লিপিবদ্ধ করা হল।</p>
<p><b>আপনার জিজ্ঞাসাবাদে আমি জবানবন্দি দিচ্ছি যে,</b> আমার নাম [সাক্ষীর নাম]। [এখানে তার পেশা লিখবে, যদি পেশা জানা না থাকে, তবে এই বাক্যটি সুকৌশলে এড়িয়ে যাবে]। [এরপর মূল জবানবন্দি শুরু হবে...]</p>

২. **বাস্তবসম্মত বক্তব্য:** সব সাক্ষী রোবটের মতো একই কথা বলবে না। যে মার খেয়েছে সে তার কষ্টের কথা বলবে, যে দূর থেকে দেখেছে সে শুধু দেখার কথা বলবে। 

৩. **ভাষাশৈলী:** প্রমিত চলিত ভাষায় লিখবে, তবে আইনি শব্দ ব্যবহার করবে (যেমন: এলোপাথাড়ি, বেআইনি জনতা, মারাত্মক অস্ত্রশস্ত্র)।

৪. **আউটপুট ফরমেট:** - প্রতিটি সাক্ষীর জবানবন্দির মাঝে একটি লাইন ব্রেক (<br><br>) দিয়ে আলাদা করবে।
   - আউটপুট অবশ্যই শুদ্ধ HTML ট্যাগ (যেমন <p>, <b>) ব্যবহার করে দেবে। কোনো কোড ব্লক (\`\`\`html) দেবে না।
    `;

    const cleanPrompt = rawPrompt.replace(/\u00A0/g, " ");
    const result = await model.generateContentStream(cleanPrompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            // 🔥 সার্ভার ক্র্যাশ ঠেকাতে ভেতরের ট্রাই-ক্যাচ ব্লক
            try {
              const chunkText = chunk.text();
              
              let cleanChunk = chunkText
                .replace(/```html/gi, "")
                .replace(/```/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/[\n\r]/g, "") 
                .replace(/[\u200B\uFEFF\u00AD]/g, "");

              if (cleanChunk) {
                controller.enqueue(new TextEncoder().encode(cleanChunk));
              }
            } catch (chunkError) {
              console.warn("Skipped a broken chunk from Gemini API", chunkError);
              // কোনো চাঙ্ক ভাঙা থাকলে সার্ভার ক্র্যাশ করবে না, শুধু ওই অংশটুকু বাদ দিয়ে সামনে এগোবে
            }
          }
        } catch (streamError) {
          console.error("Stream generation error:", streamError);
          // বড় ধরনের এরর হলে স্ট্রিমে একটি মেসেজ পাঠিয়ে বন্ধ করে দেবে
          controller.enqueue(new TextEncoder().encode("<br><br><b>⚠️ সার্ভারে সাময়িক সমস্যা হওয়ায় জবানবন্দি অসম্পূর্ণ রয়ে গেছে। দয়া করে আবার চেষ্টা করুন।</b>"));
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