"use client";
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

const ADMIN_EMAIL = "rabbanyislam89@gmail.com"; 
const COST_161 = 15; 

export default function Statement161Page() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null); 
  const [profile, setProfile] = useState({ name: "", rank: "", unit: "", bp: "" });

  const [pastedReportText, setPastedReportText] = useState("");
  const [note161, setNote161] = useState(""); 
  
  const [loading161, setLoading161] = useState(false);
  const [statement, setStatement] = useState("");       
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("new");     

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  }), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());
          if (userSnap.data().profile) setProfile(userSnap.data().profile);
        }
        loadHistory(currentUser.uid);
      } else {
        window.location.href = '/'; 
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async (userId: string) => {
    const q = query(collection(db, "reports"), where("userId", "==", userId), where("type", "==", "161"));
    const snap = await getDocs(q);
    setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt.seconds - a.createdAt.seconds));
  };

  const deleteReport = async (id: string) => {
    if(!confirm("মুছে ফেলতে চান?")) return;
    await deleteDoc(doc(db, "reports", id));
    setHistory(history.filter(h => h.id !== id));
  };

  const handleGenerate161 = async () => {
    if (!pastedReportText.trim()) return alert("দয়া করে আপনার ফাইনাল রিপোর্টটি বড় বক্সে পেস্ট করুন!");
    
    const currentBalance = userData?.balance || 0;
    const isAdmin = userData?.role === 'admin';
    if (!isAdmin && currentBalance < COST_161) { 
        alert("আপনার ব্যালেন্স কম। দয়া করে মূল পেজ থেকে রিচার্জ করুন।"); 
        return; 
    }
    
    setLoading161(true); setStatement(""); 
    
    try {
      const res = await fetch("/api/generate-161", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: pastedReportText, note: note161 }) 
      });
      
      if (!res.ok) throw new Error("Failed to fetch");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let finalStatement = "";

      if (reader) {
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunkValue = decoder.decode(value, { stream: true });
            finalStatement += chunkValue;
            setStatement(finalStatement); 
          }
        }
      }

      if (finalStatement) {
        if (!finalStatement.includes(profile.name) && profile.name) {
              finalStatement += `<br/><br/><div style="text-align:right;">----------------<br/>${profile.name}<br/>${profile.rank}<br/>বিপি: ${profile.bp}<br/>${profile.unit}</div>`;
        }
        setStatement(finalStatement);
        
        if (user) {
          const dateStr = new Date().toLocaleDateString('bn-BD');
          const extractedFileName = `১৬১ জবানবন্দি - ${dateStr}`;

          const docRef = await addDoc(collection(db, "reports"), {
            userId: user.uid, note: note161, report: finalStatement, fileName: extractedFileName, type: '161', createdAt: new Date()
          });
          loadHistory(user.uid);
          
          if (!isAdmin) {
            const newBalance = currentBalance - COST_161;
            await updateDoc(doc(db, "users", user.uid), { balance: newBalance });
            setUserData({ ...userData, balance: newBalance });
          }
        }
      } else { 
        alert("জবানবন্দি জেনারেট হয়নি।"); 
      }
    } catch (e:any) { 
      console.error(e); 
      alert("⚠️ সার্ভারে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।"); 
    }
    setLoading161(false);
  };

  const printDoc = (content: string) => {
    const pw = window.open('', '', 'width=900');
    pw?.document.write(`<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap'); @page { size: Legal; margin: 0; } body { font-family: 'Tiro Bangla', serif; font-size: 14px; line-height: 1.5; color: #000; padding-top: 1in; padding-bottom: 1in; padding-right: 1in; padding-left: 1.5in; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } th, td { border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; } @media print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style></head><body>${content}<script>window.print();window.onafterprint = function() { window.close(); };</script></body></html>`);
    pw?.document.close();
  };

  // 🔥 এখানে (htmlContent: string) টাইপ বসিয়ে দেওয়া হয়েছে
  const downloadWordDocument = (htmlContent: string) => {
    let cleanHtml = htmlContent
      .replace(/&nbsp;/gi, ' ')
      .replace(/[\u200B\u200C\u200D\uFEFF\u00AD\r\n]/g, '')
      .replace(/<strong[^>]*>/gi, '<b>')
      .replace(/<\/strong>/gi, '</b>')
      .replace(/<b\s+[^>]*>/gi, '<b>')
      .replace(/<p\s+[^>]*>/gi, '<p>')
      .replace(/<\/?span[^>]*>/gi, ''); 

    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><style>
      body { font-family: 'Vrinda', 'Kalpurush', 'Arial', sans-serif; font-size: 14pt; } 
      p { text-align: justify; margin: 0 0 10px 0; line-height: 1.5; } 
      table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 10px; } 
      td, th { border: 1px solid black; padding: 8px; text-align: left; }
    </style></head><body>`;
    const postHtml = "</body></html>";
    const finalHtml = preHtml + cleanHtml + postHtml;

    const blob = new Blob(['\ufeff', finalHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = '161_Statement.doc'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🔥 এখানেও (htmlContent: string) টাইপ বসানো হয়েছে
  const copyForWord = async (htmlContent: string) => {
    let cleanHtml = htmlContent
      .replace(/&nbsp;/gi, ' ')
      .replace(/[\u200B\u200C\u200D\uFEFF\u00AD\r\n]/g, '')
      .replace(/<strong[^>]*>/gi, '<b>')
      .replace(/<\/strong>/gi, '</b>')
      .replace(/<b\s+[^>]*>/gi, '<b>')
      .replace(/<p\s+[^>]*>/gi, '<p>')
      .replace(/<\/?span[^>]*>/gi, '');

    const wordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"></head>
      <body>${cleanHtml}</body>
      </html>
    `;

    try {
      const blobHtml = new Blob([wordHtml], { type: "text/html" });
      const blobText = new Blob([cleanHtml.replace(/<[^>]+>/g, '\n')], { type: "text/plain" });
      const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
      await navigator.clipboard.write(data);
      alert("✅ সফলভাবে কপি হয়েছে! MS Word-এ Ctrl + V দিন। কোনো চারকোনা বক্স আসবে না।");
    } catch (e) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = cleanHtml;
      tempDiv.style.position = "fixed";
      tempDiv.style.left = "-9999px"; 
      
      document.body.appendChild(tempDiv);
      
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      try { 
          document.execCommand("copy"); 
          alert("✅ লেখা কপি হয়েছে! এবার MS Word এ গিয়ে পেস্ট করুন।"); 
      } catch (err) { 
          alert("কপি করা যায়নি।"); 
      }
      
      document.body.removeChild(tempDiv);
      selection?.removeAllRanges();
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans text-slate-900">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="font-black text-2xl text-purple-900 italic">Smart<span className="text-purple-500">161</span></div>
        <div className="flex gap-4 items-center">
          <span className="font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-full border">ব্যালেন্স: ৳{userData?.balance || 0}</span>
          <button onClick={() => window.location.href = '/'} className="text-sm font-bold bg-blue-100 text-blue-700 px-5 py-2 rounded-full hover:bg-blue-200 transition shadow-sm border border-blue-200">
              🔙 মূল প্যানেলে ফেরত
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 mt-4">
        <div className="flex gap-4 mb-8 border-b">
          <button onClick={() => setActiveTab("new")} className={`pb-4 px-6 font-bold ${activeTab==='new' ? 'border-b-4 border-purple-600 text-purple-600' : 'text-slate-400'}`}>নতুন ১৬১ তৈরি</button>
          <button onClick={() => setActiveTab("history")} className={`pb-4 px-6 font-bold ${activeTab==='history' ? 'border-b-4 border-purple-600 text-purple-600' : 'text-slate-400'}`}>১৬১ এর রেকর্ড</button>
        </div>

        {activeTab === "new" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border h-fit sticky top-24">
               <div className="mb-6 flex justify-between items-center border-b pb-4">
                 <h3 className="font-black text-xl text-slate-800">ফৌঃ কাঃ বিঃ ১৬১</h3>
                 <span className="text-sm font-black text-white bg-purple-600 px-3 py-1 rounded-full shadow">চার্জ: ৳{COST_161}</span>
               </div>
               
               <label className="block text-sm font-bold text-slate-700 mb-2">১. আপনার তৈরি করা মূল রিপোর্ট পেস্ট করুন:</label>
               <textarea value={pastedReportText} onChange={e => setPastedReportText(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl h-48 mb-6 text-sm bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition" placeholder="এখানে মূল রিপোর্টটি পেস্ট করুন..."></textarea>
               
               <label className="block text-sm font-bold text-slate-700 mb-2">২. অফিসারের স্পেশাল নোট (ঐচ্ছিক):</label>
               <textarea value={note161} onChange={e => setNote161(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl h-24 mb-8 text-sm bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition" placeholder="যেমন: ১ ও ২ নং সাক্ষীর জবানবন্দি আলাদা করে লেখো..."></textarea>
               
               <button onClick={handleGenerate161} disabled={loading161} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl transition transform active:scale-95 flex justify-center items-center gap-2">
                 {loading161 ? <span className="animate-pulse">তৈরি হচ্ছে...</span> : `⚡ ১৬১ তৈরি করুন (৳${COST_161})`}
               </button>
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-3xl shadow-2xl border min-h-[600px]">
               {statement ? (
                 <div className="animate-in fade-in zoom-in-95 duration-500">
                   <div className="flex justify-end gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border">
                      <button onClick={() => downloadWordDocument(statement)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow hover:bg-blue-700 transition">💾 Word এ সেভ করুন</button>
                      <button onClick={() => copyForWord(statement)} className="bg-green-100 text-green-700 border border-green-200 px-5 py-2 rounded-xl text-sm font-bold hover:bg-green-200 transition">📋 স্মার্ট কপি</button>
                      <button onClick={() => printDoc(statement)} className="bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow hover:bg-black transition">🖨️ প্রিন্ট করুন</button>
                   </div>
                   
                   <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                     <ReactQuill theme="snow" value={statement} onChange={setStatement} modules={modules} className="h-[600px] mb-12 border-none"/>
                   </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 py-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                   <span className="text-6xl mb-4">📄</span>
                   <p className="font-bold text-lg">বাম পাশ থেকে তথ্য দিয়ে সাবমিট করুন</p>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-500 text-xs border-b">
                 <tr>
                   <th className="p-5 w-16">নং</th>
                   <th className="p-5">ফাইল (শুধুমাত্র ১৬১)</th>
                   <th className="p-5">তারিখ</th>
                   <th className="p-5 text-right">অ্যাকশন</th>
                 </tr>
               </thead>
               <tbody>
                 {history.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">কোনো রেকর্ড নেই</td></tr>}
                 {history.map((h: any, index: number) => (
                   <tr key={h.id} className="border-t hover:bg-purple-50 cursor-pointer" onClick={() => { setStatement(h.report); setActiveTab("new"); }}>
                     <td className="p-5 font-bold text-slate-500">{index + 1}</td>
                     <td className="p-5 font-bold text-slate-800">📄 {h.fileName}</td>
                     <td className="p-5 text-slate-400 text-sm">{h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                     <td className="p-5 text-right">
                        <button onClick={(e) => {e.stopPropagation(); deleteReport(h.id)}} className="text-red-500 bg-red-50 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 border border-red-100">Delete</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}