"use client";
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "./firebase"; 
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

const ADMIN_EMAIL = "rabbanyislam89@gmail.com"; 
const DEMO_VIDEO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ"; 
const COST_REPORT = 49; 
const COST_161 = 1;     
const SIGNUP_BONUS = 150; 

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null); 
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  const [systemSettings, setSystemSettings] = useState({ maintenanceMode: false, message: "সার্ভারের উন্নয়নের কাজ চলছে, দয়া করে কিছুক্ষণ অপেক্ষা করুন।" });
  const [showContactModal, setShowContactModal] = useState(false);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [adminSubTab, setAdminSubTab] = useState("users"); 

  const [profile, setProfile] = useState({ name: "", rank: "", unit: "", bp: "" });
  const [showProfile, setShowProfile] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false); 

  const [file, setFile] = useState<any>(null);
  const [note, setNote] = useState("");
  const [note161, setNote161] = useState(""); 
  
  // 🔥 নতুন স্টেট: ১৬১ এর সোর্স এবং পেস্ট করা টেক্সট সেভ করার জন্য
  const [sourceType, setSourceType] = useState("auto"); 
  const [pastedReportText, setPastedReportText] = useState("");

  const [loadingReport, setLoadingReport] = useState(false);
  const [loading161, setLoading161] = useState(false);
  
  const [report, setReport] = useState("");       
  const [statement, setStatement] = useState(""); 
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("new");     
  const [resultView, setResultView] = useState("report"); 
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [trxId, setTrxId] = useState("");
  const [submittingTrx, setSubmittingTrx] = useState(false);

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
    loadSystemSettings();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const newUser = {
            email: currentUser.email,
            name: currentUser.displayName,
            role: currentUser.email === ADMIN_EMAIL ? "admin" : "user",
            createdAt: new Date(),
            balance: SIGNUP_BONUS, 
            trxId: ""
          };
          await setDoc(userRef, newUser);
          setUserData(newUser);
        } else {
          setUserData(userSnap.data());
          if (userSnap.data().profile) setProfile(userSnap.data().profile);
        }
        
        if (currentUser.email === ADMIN_EMAIL) {
            loadAllUsers();
            loadFeedbacks();
        }
        loadHistory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadSystemSettings = async () => {
    try {
        const docRef = doc(db, "system", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setSystemSettings(docSnap.data() as any);
        }
    } catch (e) { console.log("No settings found, using default"); }
  };

  const saveSystemSettings = async () => {
    try {
        await setDoc(doc(db, "system", "settings"), systemSettings);
        alert("সিস্টেম সেটিংস আপডেট হয়েছে!");
    } catch (e) { alert("আপডেট হয়নি!"); }
  };

  const loadHistory = async (userId: string) => {
    const q = query(collection(db, "reports"), where("userId", "==", userId));
    const snap = await getDocs(q);
    setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt.seconds - a.createdAt.seconds));
  };

  const loadAllUsers = async () => {
    const q = query(collection(db, "users"));
    const snap = await getDocs(q);
    setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadFeedbacks = async () => {
    const q = query(collection(db, "feedbacks"));
    const snap = await getDocs(q);
    setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.date?.seconds - a.date?.seconds));
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) return alert("দয়া করে কিছু লিখুন!");
    try {
        await addDoc(collection(db, "feedbacks"), {
            userId: user.uid,
            userName: userData?.name || "Unknown",
            userEmail: user.email,
            message: feedbackMessage,
            date: new Date()
        });
        alert("আপনার মতামত গ্রহণ করা হয়েছে। ধন্যবাদ!");
        setShowFeedbackModal(false);
        setFeedbackMessage("");
    } catch (e) { alert("সমস্যা হয়েছে!"); }
  };

  const deleteFeedback = async (id: string) => {
    if(!confirm("মুছে ফেলতে চান?")) return;
    await deleteDoc(doc(db, "feedbacks", id));
    loadFeedbacks();
  };

  const rechargeUser = async (userId: string, currentBalance: number, userName: string) => {
    const amountStr = prompt(`${userName}-কে কত টাকা রিচার্জ দিতে চান?`, "500");
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("সঠিক সংখ্যা লিখুন!");
    if(!confirm(`নিশ্চিত ${amount} টাকা যোগ করবেন?`)) return;
    const newBalance = (currentBalance || 0) + amount;
    await updateDoc(doc(db, "users", userId), { balance: newBalance, trxId: "" });
    alert(`সফল! বর্তমান ব্যালেন্স: ${newBalance} টাকা`);
    loadAllUsers();
  };

  const submitPayment = async () => {
    if (!trxId) return alert("TrxID দিন!");
    setSubmittingTrx(true);
    if(user) {
      await updateDoc(doc(db, "users", user.uid), { trxId: trxId });
      alert("পেমেন্ট রিকোয়েস্ট পাঠানো হয়েছে!");
      setShowRechargeModal(false); 
    }
    setSubmittingTrx(false);
  };

  const saveProfile = async () => {
    if(!user) return;
    await updateDoc(doc(db, "users", user.uid), { profile: profile });
    setShowProfile(false);
    alert("Saved!");
  };

  const renameReport = async (id: string, oldName: string) => {
    const newName = prompt("ফাইলের নতুন নাম লিখুন:", oldName);
    if (!newName || newName === oldName) return; 

    try {
        await updateDoc(doc(db, "reports", id), { fileName: newName });
        setHistory(history.map(h => h.id === id ? { ...h, fileName: newName } : h));
        alert("নাম পরিবর্তন সফল!");
    } catch (error) {
        alert("নাম পরিবর্তন করা যায়নি!");
        console.error(error);
    }
  };

  const deleteReport = async (id: string) => {
    if(!confirm("মুছে ফেলতে চান?")) return;
    await deleteDoc(doc(db, "reports", id));
    setHistory(history.filter(h => h.id !== id));
  };

  const handleGenerateReport = async () => {
    const currentBalance = userData?.balance || 0;
    const isAdmin = userData?.role === 'admin';
    if (!isAdmin && currentBalance < COST_REPORT) { setShowRechargeModal(true); return; }
    if (!file) return alert("দয়া করে একটি PDF ফাইল আপলোড দিন!");
    
    setLoadingReport(true); setReport(""); setStatement(""); setResultView("report");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("note", note);
    
    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to fetch");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let finalReport = "";

      if (reader) {
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunkValue = decoder.decode(value, { stream: true });
            finalReport += chunkValue;
            setReport(finalReport); 
          }
        }
      }

      if (finalReport) {
        if (!finalReport.includes(profile.name)) {
              finalReport += `<br/><br/><div style="text-align:right;">----------------<br/>${profile.name}<br/>${profile.rank}<br/>বিপি: ${profile.bp}<br/>${profile.unit}</div>`;
        }
        setReport(finalReport);
        
        if (user) {
          let extractedFileName = file.name;
          const match = finalReport.match(/(?:পিটিশন\s*)?মামলা\s*নং[-\s]*[০-৯0-9]+/i);
          if (match && match[0]) {
              extractedFileName = match[0];
          } else {
              const dateStr = new Date().toLocaleDateString('bn-BD');
              extractedFileName = `অজ্ঞাত মামলা - ${dateStr}`;
          }

          if (history.length >= 20) {
              const itemsToDelete = history.slice(19); 
              for (let oldItem of itemsToDelete) {
                  await deleteDoc(doc(db, "reports", oldItem.id));
              }
          }

          const docRef = await addDoc(collection(db, "reports"), {
            userId: user.uid, note, report: finalReport, fileName: extractedFileName, createdAt: new Date()
          });
          setCurrentDocId(docRef.id); 
          loadHistory(user.uid);
          if (!isAdmin) {
            const newBalance = currentBalance - COST_REPORT;
            await updateDoc(doc(db, "users", user.uid), { balance: newBalance });
            setUserData({ ...userData, balance: newBalance });
          }
        }
      } else { 
        alert("রিপোর্ট জেনারেট হয়নি।"); 
      }
    } catch (e:any) { 
      console.error(e); 
      alert("⚠️ এই মুহূর্তে গুগলের সার্ভারে প্রচুর ভিড় চলছে বা সাময়িক সমস্যা হয়েছে। দয়া করে ২০-৩০ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন। আপনার কোনো টাকা কাটা হয়নি!"); 
    }
    setLoadingReport(false);
  };

  // 🔥 ১৬১ জেনারেট করার লজিক (আপডেটেড)
  const handleGenerate161 = async () => {
    let finalSourceText = "";
    
    if (sourceType === "auto") {
      if (!report) return alert("আগে রিপোর্ট তৈরি করুন অথবা 'ফাইনাল রিপোর্ট পেস্ট করুন' অপশন বেছে নিন!");
      finalSourceText = report.replace(/<[^>]+>/g, ''); 
    } else {
      if (!pastedReportText.trim()) return alert("দয়া করে আপনার ফাইনাল রিপোর্টটি টেক্সট বক্সে পেস্ট করুন!");
      finalSourceText = pastedReportText;
    }

    const currentBalance = userData?.balance || 0;
    const isAdmin = userData?.role === 'admin';
    if (!isAdmin && currentBalance < COST_161) { setShowRechargeModal(true); return; }
    
    setLoading161(true);
    try {
      const res = await fetch("/api/generate-161", { 
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: finalSourceText, note: note161 }) 
      });
      if (!res.ok) throw new Error("Failed to fetch"); 
      const data = await res.json();
      if (data.statement) {
        const finalStatement = data.statement + `<br/><br/><div style="text-align:right;">----------------<br/>${profile.name}<br/>${profile.rank}</div>`;
        setStatement(finalStatement);
        if(currentDocId && sourceType === "auto") { // শুধুমাত্র অটো হলে হিস্টোরি আপডেট
            await updateDoc(doc(db, "reports", currentDocId), { statement161: finalStatement });
        }
        if (!isAdmin) {
            const newBalance = currentBalance - COST_161;
            await updateDoc(doc(db, "users", user.uid), { balance: newBalance });
            setUserData({ ...userData, balance: newBalance });
        }
      }
    } catch (e:any) { 
      console.error(e);
      alert("⚠️ সার্ভারে ভিড় রয়েছে। একটু পর আবার চেষ্টা করুন। আপনার কোনো টাকা কাটা হয়নি!"); 
    }
    setLoading161(false);
  };

  const printDoc = (content: string) => {
    const pw = window.open('', '', 'width=900');
    pw?.document.write(`<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap'); @page { size: Legal; margin: 0; } body { font-family: 'Tiro Bangla', serif; font-size: 14px; line-height: 1.5; color: #000; padding-top: 1in; padding-bottom: 1in; padding-right: 1in; padding-left: 1.5in; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } th, td { border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; } @media print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style></head><body>${content}<script>window.print();window.onafterprint = function() { window.close(); };</script></body></html>`);
    pw?.document.close();
  };

  // 🔥 Type error fixed here (Added : string)
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
    link.download = 'PBI_Report.doc'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🔥 Type error fixed here (Added : string)
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

  const viewHistoryItem = (item: any) => {
    setReport(item.report || ""); setStatement(item.statement161 || "");
    setCurrentDocId(item.id); setActiveTab("new"); setResultView("report"); 
  };

  if (user && systemSettings.maintenanceMode && userData?.role !== 'admin') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-center p-6">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-2xl border-t-8 border-yellow-500">
                <div className="text-6xl mb-4">🚧</div>
                <h1 className="text-3xl font-black text-slate-800 mb-4">সিস্টেম মেইনটেন্যান্স চলছে</h1>
                <p className="text-lg text-slate-600 mb-8">{systemSettings.message}</p>
                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 font-bold border border-blue-100">
                    কারিগরি উন্নয়নের জন্য অ্যাপটি সাময়িকভাবে বন্ধ আছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।
                </div>
                <button onClick={() => window.location.reload()} className="mt-8 bg-slate-800 text-white px-6 py-2 rounded-full font-bold hover:bg-black transition">🔄 রিফ্রেশ করুন</button>
            </div>
        </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="text-center w-full max-w-lg bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        <h1 className="text-4xl font-black mb-2 text-blue-500">Smart PBI</h1>
        <p className="text-slate-400 mb-6 text-sm">তদন্ত কর্মকর্তাদের জন্য স্মার্ট ড্রাফটিং সলিউশন</p>
        
        <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-lg mb-8 border border-slate-600">
            <iframe 
                className="w-full h-full" 
                src={DEMO_VIDEO_URL} 
                title="Demo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
            ></iframe>
        </div>

        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-full font-bold transition shadow-lg flex items-center justify-center gap-2">
           <span className="bg-white text-blue-600 p-1 rounded-full text-xs font-black">G</span> 
           Login with Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans text-slate-900">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="font-black text-2xl text-blue-900 italic">Smart<span className="text-blue-500">PBI</span></div>
        <div className="flex gap-4 items-center">
           <button 
                onClick={() => window.open(DEMO_VIDEO_URL, "_blank")} 
                className="hidden md:flex items-center gap-2 text-sm font-bold bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-100 hover:bg-red-100 transition shadow-sm"
            >
                <span className="animate-pulse">▶</span> টিউটোরিয়াল
            </button>

          <button onClick={() => setShowRechargeModal(true)} className={`px-4 py-1 rounded-full text-sm font-bold border shadow-sm transition hover:scale-105 ${userData?.balance < 50 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-800'}`}>
              ৳ {userData?.balance || 0} +
          </button>
          
          <button onClick={() => setShowContactModal(true)} className="text-sm font-bold bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 transition flex items-center gap-1">
              📞 যোগাযোগ
          </button>

          <button onClick={() => setShowFeedbackModal(true)} className="text-sm font-bold bg-purple-100 text-purple-700 px-4 py-2 rounded-full hover:bg-purple-200 transition">
              📢 মতামত
          </button>

          <button onClick={() => setShowProfile(!showProfile)} className="text-sm font-bold bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200">
              ⚙️ প্রোফাইল
          </button>
          <button onClick={() => signOut(auth)} className="text-red-500 font-bold text-sm">Logout</button>
        </div>
      </nav>

      <div className="bg-red-50 border-b border-red-100 overflow-hidden py-2 relative">
        <style jsx>{`
          @keyframes scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .scrolling-text {
            animation: scroll 25s linear infinite;
            white-space: nowrap;
            display: inline-block;
          }
          .scrolling-text:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="scrolling-text text-red-600 font-bold text-sm">
          ⚠️ সতর্কতা: এই রিপোর্ট অটোমেটিক ভাবে বানানো তাই ভূল হতে পারে। বিজ্ঞ আদালতে পাঠানোর আগে ভালো করে চেক করে নিবেন।
        </div>
      </div>

      {showProfile && (
        <div className="bg-white p-6 border-b shadow-inner flex flex-wrap gap-4 justify-center animate-in slide-in-from-top duration-300">
          <input placeholder="নাম" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="border p-2 rounded-xl text-sm w-40"/>
          <input placeholder="পদবী" value={profile.rank} onChange={e => setProfile({...profile, rank: e.target.value})} className="border p-2 rounded-xl text-sm w-32"/>
          <input placeholder="বিপি" value={profile.bp} onChange={e => setProfile({...profile, bp: e.target.value})} className="border p-2 rounded-xl text-sm w-32"/>
          <input placeholder="ইউনিট" value={profile.unit} onChange={e => setProfile({...profile, unit: e.target.value})} className="border p-2 rounded-xl text-sm w-32"/>
          <button onClick={saveProfile} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold">Save</button>
        </div>
      )}

      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative p-8 text-center animate-in zoom-in duration-300">
             <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
             <h2 className="text-2xl font-black text-blue-900 mb-6">যোগাযোগ করুন</h2>
             
             <div className="space-y-4 text-left">
                <div className="bg-slate-50 p-4 rounded-xl border flex items-center gap-3">
                    <span className="text-2xl">📞</span>
                    <div>
                        <p className="text-xs text-slate-500 font-bold">মোবাইল</p>
                        <p className="font-bold text-slate-800">01776624515</p>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border flex items-center gap-3">
                    <span className="text-2xl">📧</span>
                    <div>
                        <p className="text-xs text-slate-500 font-bold">ইমেইল</p>
                        <p className="font-bold text-slate-800">rabbanyislam89@gmail.com</p>
                    </div>
                </div>
                <a href="https://wa.me/8801776624515" target="_blank" className="bg-green-100 p-4 rounded-xl border border-green-200 flex items-center gap-3 hover:bg-green-200 transition cursor-pointer">
                    <span className="text-2xl">💬</span>
                    <div>
                        <p className="text-xs text-green-700 font-bold">হোয়াটসঅ্যাপ</p>
                        <p className="font-bold text-green-900">মেসেজ দিন</p>
                    </div>
                </a>
             </div>
           </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative p-6 animate-in zoom-in duration-300">
             <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
             <h2 className="text-2xl font-black text-slate-800 mb-2">মতামত জানান</h2>
             <p className="text-sm text-slate-500 mb-4">সফটওয়্যার নিয়ে কোনো সমস্যা বা পরামর্শ থাকলে লিখুন।</p>
             <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} className="w-full h-32 border p-3 rounded-xl mb-4 focus:ring-2 ring-purple-500 outline-none resize-none bg-slate-50" placeholder="আপনার মতামত এখানে লিখুন..."></textarea>
             <button onClick={submitFeedback} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition">জমা দিন</button>
          </div>
        </div>
      )}

      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative">
            <button onClick={() => setShowRechargeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-800 mb-2">রিচার্জ করুন</h2>
              <p className="text-sm text-slate-500 mb-4">ব্যালেন্স: <span className="font-bold text-red-500">৳{userData?.balance}</span></p>
              <div className="bg-slate-100 p-4 rounded-xl mb-4 space-y-2">
                <p className="font-bold text-slate-700 text-xs">Send Money (Personal):</p>
                <div className="flex justify-between font-mono bg-white p-2 rounded border"><span>bKash/Nagad</span> <span className="font-bold">01776624515</span></div>
              </div>
              <input type="text" value={trxId} onChange={e => setTrxId(e.target.value)} placeholder="Transaction ID" className="w-full border p-3 rounded-xl mb-3 text-center uppercase font-mono ring-2 ring-blue-100 focus:ring-blue-500 outline-none"/>
              <button onClick={submitPayment} disabled={submittingTrx} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition">{submittingTrx ? "পাঠানো হচ্ছে..." : "পেমেন্ট ভেরিফাই করুন"}</button>
              <div className="mt-4 pt-4 border-t text-center">
                 <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner mx-auto w-40"><iframe className="w-full h-full" src={DEMO_VIDEO_URL}></iframe></div>
                 <a href="https://wa.me/8801776624515" target="_blank" className="block mt-4 text-sm text-blue-600 font-bold hover:underline">💬 হোয়াটসঅ্যাপে হেল্প নিন</a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-8 border-b">
          <button onClick={() => setActiveTab("new")} className={`pb-4 px-6 font-bold ${activeTab==='new' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>তদন্ত কাজ</button>
          <button onClick={() => setActiveTab("history")} className={`pb-4 px-6 font-bold ${activeTab==='history' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>রেকর্ড</button>
          {userData?.role === 'admin' && <button onClick={() => setActiveTab("admin")} className={`pb-4 px-6 font-bold ${activeTab==='admin' ? 'border-b-4 border-red-600 text-red-600' : 'text-slate-400'}`}>এডমিন প্যানেল</button>}
        </div>

        {activeTab === "admin" && userData?.role === 'admin' ? (
          <div className="bg-white p-8 rounded-3xl shadow-xl border">
            <div className="flex gap-4 mb-6 border-b pb-2">
                <button onClick={() => setAdminSubTab("users")} className={`font-bold ${adminSubTab==='users' ? 'text-blue-600' : 'text-gray-400'}`}>👥 ইউজার</button>
                <button onClick={() => setAdminSubTab("feedbacks")} className={`font-bold ${adminSubTab==='feedbacks' ? 'text-purple-600' : 'text-gray-400'}`}>💬 ফিডব্যাক</button>
                <button onClick={() => setAdminSubTab("system")} className={`font-bold ${adminSubTab==='system' ? 'text-red-600' : 'text-gray-400'}`}>⚠️ সিস্টেম কন্ট্রোল</button>
            </div>

            {adminSubTab === "system" ? (
                <div className="bg-red-50 p-8 rounded-2xl border border-red-200">
                    <h3 className="text-xl font-black text-red-700 mb-4">⚠️ মেইনটেন্যান্স মোড (Maintenance Mode)</h3>
                    <p className="text-sm text-red-500 mb-6">সতর্কতা: এটি চালু করলে আপনি ছাড়া অন্য কোনো ইউজার অ্যাপে ঢুকতে পারবে লাল।</p>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <span className="font-bold text-slate-700">স্ট্যাটাস:</span>
                        <button 
                            onClick={() => setSystemSettings({...systemSettings, maintenanceMode: !systemSettings.maintenanceMode})}
                            className={`px-6 py-2 rounded-full font-bold transition ${systemSettings.maintenanceMode ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                        >
                            {systemSettings.maintenanceMode ? "🔴 সফটওয়্যার বন্ধ (ON)" : "🟢 সফটওয়্যার চালু (OFF)"}
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">ইউজারদের জন্য নোটিশ মেসেজ:</label>
                        <input 
                            type="text" 
                            value={systemSettings.message} 
                            onChange={e => setSystemSettings({...systemSettings, message: e.target.value})}
                            className="w-full border p-3 rounded-xl focus:ring-2 ring-red-500 outline-none"
                        />
                    </div>
                    
                    <button onClick={saveSystemSettings} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow hover:bg-black">সেটিংস সেভ করুন</button>
                </div>
            ) : adminSubTab === "users" ? (
                <table className="w-full text-left">
                <thead className="bg-slate-50 border-b"><tr><th className="p-4">ইউজার</th><th className="p-4">ব্যালেন্স</th><th className="p-4">TrxID</th><th className="p-4">অ্যাকশন</th></tr></thead>
                <tbody>
                    {allUsers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-bold">{u.name}<br/><span className="text-xs text-slate-400 font-normal">{u.email}</span></td>
                        <td className="p-4 font-bold text-green-600">৳ {u.balance || 0}</td>
                        <td className="p-4 font-mono text-blue-600">{u.trxId ? <span className="bg-yellow-100 px-2 py-1 rounded border-yellow-200 border">{u.trxId}</span> : "-"}</td>
                        <td className="p-4">
                        {u.trxId ? 
                            <button onClick={() => rechargeUser(u.id, u.balance, u.name)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-xs font-bold shadow animate-pulse">✅ Recharge</button> :
                            <span className="text-xs text-gray-400">---</span>
                        }
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            ) : (
                <div className="space-y-4">
                    {feedbacks.length === 0 && <p className="text-gray-400">কোনো ফিডব্যাক নেই।</p>}
                    {feedbacks.map(f => (
                        <div key={f.id} className="bg-slate-50 p-4 rounded-xl border relative hover:bg-white hover:shadow transition">
                            <h4 className="font-bold text-slate-800">{f.userName} <span className="text-xs font-normal text-slate-500">({f.userEmail})</span></h4>
                            <p className="text-slate-600 mt-2 bg-white p-3 rounded border text-sm">{f.message}</p>
                            <span className="text-xs text-slate-400 mt-2 block">{f.date?.seconds ? new Date(f.date.seconds * 1000).toLocaleString() : '-'}</span>
                            <button onClick={() => deleteFeedback(f.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold">Delete</button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        ) : activeTab === "new" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border h-fit sticky top-24">
               <div className="mb-4 flex justify-between items-center">
                 <h3 className="font-black text-slate-800">নতুন মামলা</h3>
                 <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">চার্জ: ৳{COST_REPORT}</span>
               </div>
               <textarea onChange={e => setNote(e.target.value)} className="w-full border p-4 rounded-2xl h-24 mb-6 text-sm bg-slate-50 focus:ring-2 ring-blue-500 outline-none" placeholder="অফিসারের নোট..."></textarea>
               <input type="file" accept=".pdf" onChange={(e: any) => setFile(e.target.files[0])} className="w-full text-xs mb-8 p-4 bg-blue-50 rounded-2xl border border-dashed border-blue-200 cursor-pointer"/>
               <button onClick={handleGenerateReport} disabled={loadingReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl transition active:scale-95">{loadingReport ? "তৈরি হচ্ছে..." : `রিপোর্ট তৈরি করুন (৳${COST_REPORT})`}</button>
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-3xl shadow-2xl border min-h-[600px]">
               <div className="flex gap-6 mb-8 border-b">
                 <button onClick={() => setResultView("report")} className={`pb-2 font-black transition ${resultView === 'report' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>প্রতিবেদন</button>
                 <button onClick={() => setResultView("statement")} className={`pb-2 font-black transition ${resultView === 'statement' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>১৬১ জবানবন্দি</button>
               </div>
               
               {/* 🔥 নতুন কন্ডিশনাল লজিক (স্বতন্ত্র ট্যাব) */}
               {resultView === "report" && (
                 report ? (
                   <div className="animate-in fade-in duration-500">
                     <div className="flex justify-end gap-3 mb-4">
                        <button onClick={() => downloadWordDocument(report)} className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold shadow-md hover:bg-blue-700 transition flex items-center gap-1">💾 Word এ ডাউনলোড করুন</button>
                        <button onClick={() => copyForWord(report)} className="bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-full text-xs font-bold shadow-sm hover:bg-green-200 transition">📋 স্মার্ট কপি</button>
                        <button onClick={() => printDoc(report)} className="bg-slate-900 text-white px-6 py-2 rounded-full text-xs font-bold shadow hover:bg-black transition">🖨️ প্রিন্ট করুন</button>
                     </div>
                     
                     <div className="bg-white rounded-2xl border overflow-hidden">
                       <ReactQuill theme="snow" value={report} onChange={setReport} modules={modules} className="h-[600px] mb-12"/>
                     </div>
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32">
                     <p className="font-bold">বাম পাশ থেকে ফাইল আপলোড দিন</p>
                   </div>
                 )
               )}

               {resultView === "statement" && (
                  statement ? (
                    <div className="animate-in fade-in duration-500">
                      <div className="flex justify-end gap-3 mb-4">
                         <button onClick={() => downloadWordDocument(statement)} className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold shadow-md hover:bg-blue-700 transition flex items-center gap-1">💾 Word এ ডাউনলোড করুন</button>
                         <button onClick={() => copyForWord(statement)} className="bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-full text-xs font-bold shadow-sm hover:bg-green-200 transition">📋 স্মার্ট কপি</button>
                         <button onClick={() => printDoc(statement)} className="bg-slate-900 text-white px-6 py-2 rounded-full text-xs font-bold shadow hover:bg-black transition">🖨️ প্রিন্ট করুন</button>
                      </div>
                      
                      <div className="bg-white rounded-2xl border overflow-hidden">
                        <ReactQuill theme="snow" value={statement} onChange={setStatement} modules={modules} className="h-[600px] mb-12"/>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[600px] flex flex-col items-center justify-center bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200 p-8 text-center animate-in fade-in duration-500">
                        <h3 className="text-2xl font-black text-slate-700 mb-4">১৬১ জবানবন্দি প্রস্তুত করুন</h3>
                        
                        <div className="flex bg-white rounded-xl shadow-sm border p-1 mb-6">
                            <button onClick={() => setSourceType("auto")} className={`px-4 py-2 text-sm font-bold rounded-lg transition ${sourceType === 'auto' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>অটো-জেনারেট করা রিপোর্ট থেকে</button>
                            <button onClick={() => setSourceType("paste")} className={`px-4 py-2 text-sm font-bold rounded-lg transition ${sourceType === 'paste' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>ফাইনাল রিপোর্ট পেস্ট করুন</button>
                        </div>

                        {sourceType === "paste" && (
                            <textarea 
                                value={pastedReportText}
                                onChange={e => setPastedReportText(e.target.value)} 
                                className="w-full max-w-2xl border p-4 rounded-xl h-40 mb-4 text-sm bg-white focus:ring-2 ring-blue-500 outline-none shadow-sm" 
                                placeholder="MS Word থেকে আপনার এডিট করা চূড়ান্ত তদন্ত প্রতিবেদনটি (বিশেষ করে ১৫ ও ১৬ নং পয়েন্ট) কপি করে এখানে পেস্ট করুন..."
                            ></textarea>
                        )}

                        <textarea 
                            value={note161}
                            onChange={e => setNote161(e.target.value)} 
                            className="w-full max-w-2xl border p-4 rounded-xl h-24 mb-6 text-sm bg-white focus:ring-2 ring-purple-500 outline-none shadow-sm" 
                            placeholder="১৬১ এর জন্য বিশেষ আইও নোট (যেমন: কোন সাক্ষীর জবানবন্দি নিতে চান, সে কী বলেছে ইত্যাদি...)"
                        ></textarea>

                        <button onClick={handleGenerate161} disabled={loading161} className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center gap-2">{loading161 ? "তৈরি হচ্ছে..." : `⚡ ১৬১ তৈরি করুন (৳${COST_161})`}</button>
                    </div>
                  )
               )}

            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-500 text-xs border-b">
                 <tr>
                   <th className="p-5 w-16">নং</th>
                   <th className="p-5">ফাইল</th>
                   <th className="p-5">তারিখ</th>
                   <th className="p-5 text-right">অ্যাকশন</th>
                 </tr>
               </thead>
               <tbody>
                 {history.map((h, index) => (
                   <tr key={h.id} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => viewHistoryItem(h)}>
                     <td className="p-5 font-bold text-slate-500">{index + 1}</td>
                     <td className="p-5 font-bold text-slate-800">📄 {h.fileName}</td>
                     <td className="p-5 text-slate-400 text-sm">{h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                     <td className="p-5 text-right">
                        <button onClick={(e) => {e.stopPropagation(); renameReport(h.id, h.fileName)}} className="text-blue-500 font-bold text-sm mr-4 hover:underline">Rename</button>
                        <button onClick={(e) => {e.stopPropagation(); deleteReport(h.id)}} className="text-red-400 font-bold text-sm hover:underline">Delete</button>
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