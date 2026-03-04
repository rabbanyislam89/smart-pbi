export const maxDuration = 60;
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get("file");
    const note = data.get("note") || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // ==================================================================================
    // 🔥 ফিক্স: অতিরিক্ত <p>&nbsp;</p> বা <br> ফেলে দেওয়া হয়েছে।
    // এখন প্যারাগ্রাফের মাঝে ন্যাচারাল গ্যাপ থাকবে।
    // ==================================================================================
    
    const prompt = `
      ভূমিকা: তুমি একজন পিবিআই তদন্ত কর্মকর্তা। পিডিএফটি পড়ো।

      কাজ: নিচের তথ্যগুলো বের করে একটি HTML রিপোর্ট তৈরি করো।

      সতর্কতা:
      ১. আউটপুট শুধুমাত্র HTML কোড হবে।
      ২. <div> ব্যবহার করবে না। প্রতিটি লাইনের জন্য <p> ব্যবহার করবে।
      ৩. **প্যারাগ্রাফের মাঝে কোনো বাড়তি <br> বা ফাঁকা লাইন দিবে না।**

      আউটপুট স্ট্রাকচার (হুবহু এই ফরম্যাটে দিবে):

      <p><b>বরাবর</b></p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[আদালতের নাম]</p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[আদালতের স্থান/জেলা]</p>
      
      <p><b>মাধ্যম : যথাযথ কর্তৃপক্ষ।</b></p>
      
      <p><b>বিষয় : অনুসন্ধান/তদন্ত প্রতিবেদন প্রেরণ প্রসঙ্গে।</b></p>
      
      <p><b>সূত্র :</b> [মামলা নং, তারিখ ও ধারা]</p>

      <p>জনাব,</p>
      <p>বিনীত নিবেদন এই যে, সূত্রোক্ত মামলাটি তদন্তের জন্য পিবিআই-কে নির্দেশ প্রদান করলে আমি এর তদন্তভার গ্রহণ করি। আমার প্রকাশ্য ও গোপন তদন্তে প্রাপ্ত তথ্যের আলোকে নিম্নোক্ত প্রতিবেদন দাখিল করলাম।</p>

      <p><b>১। বাদী/অভিযোগকারীর নাম ও ঠিকানা:</b> [তথ্য]</p>

      <p><b>২। বিবাদী/বিবাদীদের নাম ও ঠিকানা:</b></p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;১। [নাম ও ঠিকানা]</p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;২। [নাম ও ঠিকানা]</p>

      <p><b>৩। ঘটনাস্থল, ঘটনার তারিখ ও সময়কাল (চৌহদ্দী সহ):</b> [তথ্য]</p>

      <p><b>৪। তদারকী অফিসার:</b> [নাম ও পদবী]</p>

      <p><b>৫। নালিশী দরখাস্তের সারাংশ:</b></p>
      <p>[বিবরণ]</p>

      <p><b>৬। বিজ্ঞ আদালতের আদেশ পর্যালোচনা:</b></p>
      <p>[বিবরণ]</p>

      <p><b>৭। অভিযোগ পর্যালোচনায় বিবেচ্য বিষয় সমূহ:</b></p>
      <p>[পয়েন্ট]</p>

      <p><b>৮। পিবিআই কর্তৃক মামলা গ্রহণের তারিখ:</b> [তারিখ]</p>

      <p><b>৯। ঘটনাস্থল পরিদর্শন ও ম্যাপ:</b></p>
      <p>[বিবরণ]</p>

      <p><b>১০। অভিযোগকারীকে জিজ্ঞাসাবাদ:</b></p>
      <p>[বিবরণ]</p>

      <p><b>১১। সাক্ষীদের নাম ও ঠিকানা:</b></p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;১। [নাম ও ঠিকানা]</p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;২। [নাম ও ঠিকানা]</p>

      <p><b>১২। আলামত জব্দ:</b> [বিবরণ]</p>

      <p><b>১৩। বিশেষজ্ঞের মতামত (জখমি সনদ):</b> [বিবরণ]</p>

      <p><b>১৪। দালিলিক সাক্ষ্যের পর্যালোচনা:</b></p>
      <p>[বিবরণ]</p>

      <p><b>১৫। পিবিআই কর্তৃক তদন্ত/অনুসন্ধান (বিস্তারিত):</b></p>
      <p>[সরজমিন তদন্তের বিস্তারিত বর্ণনা]</p>

      <p><b>১৬। মতামত:</b></p>
      <p>[চূড়ান্ত মতামত]</p>

      অফিসারের নোট: "${note}"

      বিশেষ নির্দেশ:
      - যদি আদালতের নাম পিডিএফে না পাওয়া যায়, তবে লিখবে: "আপনার পিডিএফ এ পাওয়া যায় নাই আদালতের তথ্য"।
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || "application/pdf",
        },
      },
    ]);

    let reportText = result.response.text();
    reportText = reportText.replace(/```html/g, "").replace(/```/g, "");

    return NextResponse.json({ report: reportText });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে।" }, { status: 500 });
  }
}