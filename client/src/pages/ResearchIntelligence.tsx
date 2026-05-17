import { useState } from "react";
const SECTIONS = [
  { key:"A", label:"Top 10 Papers", icon:"📄", color:"#58a6ff" },
  { key:"B", label:"Cross-Paper Comparative Analysis", icon:"🔍", color:"#79c0ff" },
  { key:"C", label:"Research Gap Analysis", icon:"🕳️", color:"#d2a8ff" },
  { key:"D", label:"Novelty Opportunities", icon:"💡", color:"#ffa657" },
  { key:"E", label:"Suggested Experiments", icon:"🧪", color:"#56d364" },
  { key:"F", label:"Feasibility & Impact Analysis", icon:"⚖️", color:"#ff7b72" },
  { key:"G", label:"Biomedical & Translational Potential", icon:"🏥", color:"#58a6ff" },
  { key:"H", label:"Q1 Publication Strategy", icon:"📊", color:"#ffa657" },
  { key:"I", label:"Future Research Roadmap", icon:"🚀", color:"#56d364" },
  { key:"J", label:"Word-Ready Scientific Summary", icon:"📝", color:"#79c0ff" },
  { key:"K", label:"ChatGPT Handoff Summary", icon:"🤖", color:"#d2a8ff" },
] as const;
const STEPS = [
  { label:"Searching Q1 literature", icon:"🔎" },
  { label:"Filtering top 10 papers", icon:"📑" },
  { label:"Running comparative analysis", icon:"🔍" },
  { label:"Identifying research gaps", icon:"🕳️" },
  { label:"Extracting novelty opportunities", icon:"💡" },
  { label:"Evaluating feasibility", icon:"⚖️" },
  { label:"Assessing biomedical potential", icon:"🏥" },
  { label:"Building publication strategy", icon:"📊" },
];
function parseSection(text: string, key: string) {
  const start = text.indexOf(`===SECTION_${key}===`);
  const end = text.indexOf(`===END_${key}===`);
  if (start===-1||end===-1) return null;
  return text.slice(start+`===SECTION_${key}===`.length, end).trim();
}
function MD({ text }: { text: string }) {
  return <div style={{lineHeight:1.75}}>{text.split("\n").map((line,i)=>{
    if (line.startsWith("### ")) return <h3 key={i} style={{fontSize:"0.92rem",fontWeight:700,color:"#79c0ff",margin:"14px 0 5px",borderBottom:"1px solid #21262d",paddingBottom:4}}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")||line.startsWith("# ")) return <h2 key={i} style={{fontSize:"1rem",fontWeight:800,color:"#58a6ff",margin:"16px 0 6px"}}>{line.replace(/^#+\s/,"")}</h2>;
    if (line.startsWith("- ")||line.startsWith("* ")) return <li key={i} style={{margin:"4px 0 4px 18px",fontSize:"0.86rem",color:"#c9d1d9"}} dangerouslySetInnerHTML={{__html:line.slice(2).replace(/\*\*(.+?)\*\*/g,"<strong style='color:#e6edf3'>$1</strong>")}}/>;
    if (/^\d+\.\s/.test(line)) return <li key={i} style={{margin:"4px 0 4px 22px",fontSize:"0.86rem",color:"#c9d1d9",listStyle:"decimal"}} dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.+?)\*\*/g,"<strong style='color:#e6edf3'>$1</strong>")}}/>;
    if (/^\*\*(.+)\*\*$/.test(line)) return <div key={i} style={{fontWeight:800,color:"#e6edf3",margin:"12px 0 3px",borderLeft:"3px solid #388bfd",paddingLeft:10}}>{line.replace(/\*\*/g,"")}</div>;
    if (line.startsWith("---")) return <hr key={i} style={{border:"none",borderTop:"1px solid #21262d",margin:"12px 0"}}/>;
    if (!line.trim()) return <div key={i} style={{height:7}}/>;
    return <p key={i} style={{margin:"3px 0",fontSize:"0.86rem",color:"#c9d1d9"}} dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.+?)\*\*/g,"<strong style='color:#e6edf3'>$1</strong>")}}/>;
  })}</div>;
}
export default function ResearchIntelligence() {
  const [topic,setTopic]=useState("");
  const [loading,setLoading]=useState(false);
  const [raw,setRaw]=useState("");
  const [open,setOpen]=useState<Record<string,boolean>>({});
  const [error,setError]=useState("");
  const [step,setStep]=useState(0);
  const [copied,setCopied]=useState("");
  const [elapsed,setElapsed]=useState<string|null>(null);
  async function run() {
    if (!topic.trim()||loading) return;
    setLoading(true);setRaw("");setOpen({});setError("");setStep(0);setElapsed(null);
    const t0=Date.now(); let s=0;
    const iv=setInterval(()=>{s=Math.min(s+1,STEPS.length-1);setStep(s);},5500);
    try {
      const res=await fetch("/api/research-intelligence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic})});
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||"Server error");
      setRaw(data.result);
      setElapsed(((Date.now()-t0)/1000).toFixed(1));
      const o:Record<string,boolean>={};
      SECTIONS.forEach(s=>{o[s.key]=s.key==="C"||s.key==="D";});
      setOpen(o);
    } catch(e:unknown){setError("Error: "+(e instanceof Error?e.message:String(e)));}
    finally{clearInterval(iv);setLoading(false);}
  }
  function copySection(key:string,label:string){const c=parseSection(raw,key);if(c){navigator.clipboard.writeText(`# ${label}\n\n${c}`);setCopied(key);setTimeout(()=>setCopied(""),2000);}}
  function copyAll(){navigator.clipboard.writeText(raw);setCopied("all");setTimeout(()=>setCopied(""),2000);}
  const found=SECTIONS.filter(s=>parseSection(raw,s.key));
  return (
    <div style={{minHeight:"100vh",background:"#0d1117",color:"#e6edf3",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box}textarea:focus{outline:none;border-color:#388bfd!important;box-shadow:0 0 0 3px rgba(56,139,253,.12)}.btn:hover:not(:disabled){background:#1a7f37!important}.btn:disabled{opacity:.4;cursor:not-allowed}.sm:hover{background:#30363d!important}.ph:hover{background:#1c2128!important}.sc{border:1px solid #21262d;border-radius:12px;overflow:hidden;margin-bottom:10px}.sc:hover{border-color:#30363d}.pulse{animation:pulse 1.3s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px}`}</style>
      <div style={{background:"linear-gradient(180deg,#161b22,#0d1117)",borderBottom:"1px solid #21262d",padding:"16px 28px"}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{width:38,height:38,borderRadius:9,background:"linear-gradient(135deg,#1f6feb,#388bfd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔬</div>
          <div style={{flex:1}}><h1 style={{margin:0,fontSize:"1.18rem",fontWeight:800,color:"#e6edf3"}}>Research Intelligence Engine</h1><p style={{margin:0,fontSize:"0.72rem",color:"#6e7681"}}>Marine Biotech · Q1 Editorial Grade · 11-Section Analysis</p></div>
          {["Nature/Elsevier","Q1 Editorial","Gap Detection","Novelty Engine"].map(t=><span key={t} style={{fontSize:"0.7rem",padding:"2px 9px",borderRadius:20,background:"#1f6feb22",color:"#58a6ff",border:"1px solid #388bfd33",fontWeight:600}}>{t}</span>)}
        </div>
      </div>
      <div style={{maxWidth:980,margin:"0 auto",padding:"24px 24px 48px"}}>
        <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:14,padding:20,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:"0.75rem",fontWeight:700,color:"#6e7681",textTransform:"uppercase",letterSpacing:".08em"}}>📌 Research Topic</span>
            <span style={{fontSize:"0.71rem",color:"#484f58"}}>Ctrl+Enter to run</span>
          </div>
          <textarea value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))run();}} placeholder="e.g. Fucoidan-functionalized gold nanoparticles for pH-responsive anticancer drug delivery with photothermal therapy" rows={3} style={{width:"100%",background:"#0d1117",border:"1px solid #30363d",borderRadius:8,padding:"11px 14px",color:"#e6edf3",fontSize:"0.875rem",resize:"vertical",lineHeight:1.65,fontFamily:"inherit"}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
            <button className="btn" onClick={run} disabled={loading||!topic.trim()} style={{background:"#238636",color:"#fff",border:"none",borderRadius:8,padding:"10px 26px",fontWeight:700,fontSize:"0.875rem",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
              {loading?<><span className="pulse" style={{fontSize:"0.7rem"}}>●</span> Analyzing…</>:<><span>⚡</span> Run Full Analysis</>}
            </button>
          </div>
        </div>
        {loading&&(
          <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:14,padding:22,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{color:"#58a6ff",fontWeight:600,fontSize:"0.9rem"}}>{STEPS[step].icon} {STEPS[step].label}…</span>
              <span style={{fontSize:"0.72rem",color:"#6e7681"}}>Step {step+1}/{STEPS.length}</span>
            </div>
            <div style={{background:"#0d1117",borderRadius:6,overflow:"hidden",height:4,marginBottom:16}}>
              <div style={{height:"100%",background:"linear-gradient(90deg,#238636,#56d364)",borderRadius:6,width:`${((step+1)/STEPS.length)*100}%`,transition:"width 1s ease"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
              {STEPS.map((st,i)=><div key={i} style={{background:i<=step?"#1f6feb12":"#0d1117",border:`1px solid ${i<=step?"#388bfd44":"#21262d"}`,borderRadius:8,padding:"8px 10px"}}>
                <div style={{fontSize:"0.68rem",fontWeight:700,color:i<=step?"#58a6ff":"#484f58"}}>Step {i+1}</div>
                <div style={{fontSize:"0.65rem",color:i<=step?"#79c0ff":"#30363d",lineHeight:1.4}}>{st.label}</div>
              </div>)}
            </div>
          </div>
        )}
        {error&&<div style={{background:"#3d1f1f",border:"1px solid #6e3030",borderRadius:10,padding:"14px 16px",marginBottom:14,color:"#ff7b72",fontSize:"0.875rem"}}>⚠️ {error}</div>}
        {!!raw&&!loading&&(
          <>
            <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:"12px 18px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:20}}>
                <div><div style={{fontSize:"0.66rem",color:"#6e7681",textTransform:"uppercase"}}>Sections</div><div style={{fontSize:"1.1rem",fontWeight:800,color:"#56d364"}}>{found.length}<span style={{fontSize:"0.8rem",color:"#484f58"}}> / {SECTIONS.length}</span></div></div>
                {elapsed&&<div><div style={{fontSize:"0.66rem",color:"#6e7681",textTransform:"uppercase"}}>Time</div><div style={{fontSize:"1.1rem",fontWeight:800,color:"#58a6ff"}}>{elapsed}s</div></div>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="sm" onClick={()=>setOpen(SECTIONS.reduce((a,s)=>({...a,[s.key]:true}),{}))} style={{background:"#21262d",border:"1px solid #30363d",color:"#c9d1d9",borderRadius:6,padding:"6px 13px",fontSize:"0.75rem",cursor:"pointer"}}>Expand All</button>
                <button className="sm" onClick={()=>setOpen({})} style={{background:"#21262d",border:"1px solid #30363d",color:"#c9d1d9",borderRadius:6,padding:"6px 13px",fontSize:"0.75rem",cursor:"pointer"}}>Collapse All</button>
                <button className="sm" onClick={copyAll} style={{background:copied==="all"?"#1f6feb":"#21262d",border:"1px solid #30363d",color:copied==="all"?"#fff":"#c9d1d9",borderRadius:6,padding:"6px 14px",fontSize:"0.75rem",cursor:"pointer"}}>{copied==="all"?"✅ Copied!":"📋 Copy All"}</button>
              </div>
            </div>
            {SECTIONS.map(({key,label,icon,color})=>{
              const content=parseSection(raw,key); const isOpen=!!open[key];
              return <div key={key} className="sc">
                <div className="ph" onClick={()=>content&&setOpen(p=>({...p,[key]:!p[key]}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 17px",background:"#161b22",cursor:content?"pointer":"default",userSelect:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:7,background:content?`${color}18`:"#21262d",border:`1px solid ${content?color+"44":"#30363d"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem"}}>{icon}</div>
                    <span style={{fontWeight:700,fontSize:"0.875rem",color:content?"#e6edf3":"#484f58"}}><span style={{color:content?color:"#484f58",marginRight:6,fontWeight:800,fontSize:"0.8rem"}}>{key}.</span>{label}</span>
                    {!content&&<span style={{fontSize:"0.68rem",padding:"2px 7px",borderRadius:20,background:"#3d1f1f",color:"#ff7b72",border:"1px solid #6e3030",marginLeft:4}}>Not parsed</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {content&&<button onClick={e=>{e.stopPropagation();copySection(key,label);}} style={{background:"transparent",border:"1px solid #30363d",color:"#6e7681",borderRadius:5,padding:"3px 10px",fontSize:"0.7rem",cursor:"pointer"}}>{copied===key?"✅":"📋"}</button>}
                    {content&&<span style={{color:"#484f58",fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>}
                  </div>
                </div>
                {isOpen&&content&&<div style={{padding:"20px 22px",background:"#090c10",borderTop:"1px solid #21262d"}}><MD text={content}/></div>}
              </div>;
            })}
          </>
        )}
        {!raw&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"64px 24px"}}>
            <div style={{fontSize:48,marginBottom:14}}>🔬</div>
            <div style={{fontWeight:700,fontSize:"1rem",color:"#6e7681",marginBottom:8}}>Ready for Q1-Level Analysis</div>
            <div style={{fontSize:"0.83rem",color:"#484f58",maxWidth:460,margin:"0 auto"}}>Enter your research topic and click <strong style={{color:"#56d364"}}>Run Full Analysis</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}
