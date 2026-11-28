import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WelcomeBrick } from "@/family-original/components/WelcomeBrick";
import { Badge } from "@/family-original/components/Brick";
import { JoinForm } from "@/family-original/components/JoinForm";
import { FamilyMember } from "@/family-original/lib/mockData";
import { apiUrl } from "@/family-original/lib/api";

import { Wall } from "@/family-original/components/Wall";
import { useJoinHandoff } from "@/family-original/components/brick-experience/useJoinHandoff";

async function fetchMembers({signal}: {signal?:AbortSignal} = {}): Promise<FamilyMember[]> {
  const res = await fetch(apiUrl("/api/members"), {signal});
  if (!res.ok) throw new Error("Failed to fetch members");
  const data = await res.json();
  // Accept legacy three-field records as well as public join-month records.
  return data.map(([id, title, name, joinedMonth]: [string, string, string, (string | null)?]) => ({ id, title, name, joinedMonth }));
}

async function addMember(member: Omit<FamilyMember, "id">): Promise<FamilyMember> {
  const res = await fetch(apiUrl("/api/members"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  if (!res.ok) throw new Error("Failed to add member");
  return res.json();
}

// Server renders the brick PNG (node-canvas, see server/brickImage.ts)
function brickPngUrl(title: string, name: string): string {
  const qs = new URLSearchParams({ title, name, artwork: "badge-v1" }).toString();
  return apiUrl(`/api/brick.png?${qs}`);
}

const EMPTY_MEMBERS: FamilyMember[] = [];
type ArrivalPhase = "idle" | "isolate" | "flight" | "reveal" | "hold";
type Arrival = { member: FamilyMember; source: DOMRect | null };

export default function Home() {
  const queryClient = useQueryClient();
  const [downloadError, setDownloadError] = useState("");
  const [savingBrick, setSavingBrick] = useState(false);
  const saveLock = useRef(false);
  const [newestMemberId, setNewestMemberId] = useState<string | null>(null);
  const [showInstagramInvitation, setShowInstagramInvitation] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [latestMember, setLatestMember] = useState<FamilyMember | null>(null);
  const [showWallOnly, setShowWallOnly] = useState(true);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [arrivalPhase, setArrivalPhase] = useState<ArrivalPhase>("idle");
  const [arrivalMember, setArrivalMember] = useState<FamilyMember | null>(null);
  const arrivalLock = useRef(false);
  const arrivalBrick = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const arrivalActive = arrivalPhase !== "idle";

  // A single, canonical front-face travels to the real central row. The wall
  // stays mounted and stopped until the five-second reading period completes.
  useEffect(() => {
    if (!arrival) return;
    let cancelled = false, timer = 0, raf = 0, animation: Animation | undefined;
    let finishStarted = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const after = (ms: number, fn: () => void) => { timer = window.setTimeout(() => { if (!cancelled) fn(); }, ms); };
    const finish = () => {
      if (cancelled || finishStarted) return;
      finishStarted = true;
      animation?.cancel();
      setShowWallOnly(true);
      setArrivalPhase("hold");
      setHighlightedMemberId(null);
      after(5000, () => {
        setArrivalPhase("idle");
        setArrival(null);
        arrivalLock.current = false;
        requestAnimationFrame(() => pageRef.current?.querySelector<HTMLElement>(".family-wall-intro h1")?.focus({preventScroll:true}));
      });
    };
    const reveal = () => {
      if (cancelled || finishStarted) return;
      setArrivalPhase("reveal");
      after(1200, finish);
    };
    const fly = () => {
      setShowWallOnly(true);
      setArrivalPhase("flight");
      // Wait for React and the wall engine to paint the centered destination.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (cancelled || finishStarted) return;
          const row = pageRef.current?.querySelector<HTMLElement>('[data-arrival-row="true"]');
          const source = arrival.source, node = arrivalBrick.current;
          if (!row || !source || !source.width || !node || typeof node.animate !== "function") { finish(); return; }
          const bounds = row.getBoundingClientRect();
          const candidates = Array.from(row.querySelectorAll<HTMLElement>(".family-wall-brick")).filter(item => item.dataset.memberId === arrival.member.id);
          const centerX = bounds.left + bounds.width / 2;
          const destination = candidates.map(item=>item.getBoundingClientRect()).sort((a,b)=>Math.abs(a.left+a.width/2-centerX)-Math.abs(b.left+b.width/2-centerX))[0];
          if (!destination || !destination.width) { finish(); return; }
          const dx = destination.left - source.left, dy = destination.top - source.top;
          const scale = destination.width / source.width;
          animation = node.animate([{transform:"translate3d(0,0,0) scale(1)"},{transform:`translate3d(${dx}px,${dy}px,0) scale(${scale})`}],{duration:1800,easing:"cubic-bezier(.45,0,.25,1)",fill:"forwards"});
          animation.onfinish = reveal;
        });
      });
    };
    const skip = () => { if (!finishStarted) { clearTimeout(timer); cancelAnimationFrame(raf); finish(); } };
    const onMotion = () => { if (media.matches) skip(); };
    if (media.matches || !arrival.source) finish();
    else after(800, fly);
    media.addEventListener("change",onMotion);
    window.addEventListener("resize",skip);
    return () => { cancelled=true; clearTimeout(timer); cancelAnimationFrame(raf); animation?.cancel(); media.removeEventListener("change",onMotion); window.removeEventListener("resize",skip); };
  }, [arrival]);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);
  const [isExistingMember, setIsExistingMember] = useState(false);
  const [celebrationPlayed,setCelebrationPlayed] = useState(false);
  const handleCelebrationComplete=useCallback(()=>setCelebrationPlayed(true),[]);
  const handoff=useJoinHandoff();

  const { data: familyMembers = EMPTY_MEMBERS, isFetched, isPending, isError, refetch } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    retry: 1,
  });

  // Prepare updates independently of the browse toggle. Opening the wall never
  // swaps a frozen list for another list or restarts its scrolling rows.
  const [wallMembers,setWallMembers] = useState<FamilyMember[]>(EMPTY_MEMBERS);
  useEffect(()=>{if(isFetched)setWallMembers(familyMembers);},[familyMembers,isFetched]);

  const addMemberMutation = useMutation({
    mutationFn: (member: Omit<FamilyMember, "id">) => addMember(member),
    onSuccess: (newMember) => {
      queryClient.setQueryData<FamilyMember[]>(["members"], (current = []) => {
        if (current.some((member) => member.id === newMember.id)) return current;
        return [...current, newMember];
      });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setHasSubmitted(true);
      setLatestMember(newMember);
      setNewestMemberId(null);
      setWallMembers(current=>current.some(member=>member.id===newMember.id)?current:[...current,newMember]);
      setShowInstagramInvitation(true);
      handoff.begin();
    },
  });

  const handleJoin = async (member: Omit<FamilyMember, "id">) => {
    // The brick is available on screen and through Save your brick.
    // Optional email delivery belongs to the Mailchimp signup journey.
    await addMemberMutation.mutateAsync(member);
  };

  const handleExistingMember = (member: FamilyMember) => {
    setLatestMember(member);
    setIsExistingMember(true);
    setHasSubmitted(true);
    setHighlightedMemberId(member.id);
    setShowInstagramInvitation(true);
    handoff.begin();
  };

  const handleExportAndSaveTile = async () => {
    if (!latestMember || saveLock.current) return;
    saveLock.current = true;
    setSavingBrick(true);
    setDownloadError("");
    // Server renders the same 5000 × 1630 SVG used on the wall.
    // and returns it with Content-Disposition: attachment.
    const url = brickPngUrl(latestMember.title, latestMember.name);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`brick fetch ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objUrl;
      link.download = `${latestMember.name}-${latestMember.title}-grandma-jazz.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Release the blob after the download tick.
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch (e) {
      console.error("brick export failed:", e);
      setDownloadError("Your brick couldn’t be downloaded. Please try again.");
    } finally {
      saveLock.current = false;
      setSavingBrick(false);
    }
  };

  return (
    <div ref={pageRef} data-arrival-phase={arrivalPhase} data-view={showWallOnly?"wall":"join"} className="family-page relative w-full min-h-dvh overflow-x-clip bg-black text-white selection:bg-white selection:text-black">
      {/* Keep the actual wall mounted from the first frame. */}
        <Wall
          members={wallMembers}
          newestMemberId={newestMemberId}
          highlightedMemberId={highlightedMemberId}
          paused={arrivalActive||(hasSubmitted&&!showWallOnly)}
          browsable={showWallOnly&&!arrivalActive}
          arrivalMember={arrivalMember}
          arrivalHold={arrivalActive}
        />

      {/* Foreground Content */}
      <div className="family-foreground relative z-10 w-full min-h-dvh flex flex-col items-center pointer-events-none">
        {showWallOnly && <header className="family-wall-intro"><h1 tabIndex={-1}>The family <span>wall.</span></h1><p>Real Family names. Your brick belongs here too. Swipe to browse; tap a brick to see when they joined.</p></header>}
        {showWallOnly && !arrivalActive && familyMembers.length===0 && (
          <main className="family-wall-status pointer-events-auto" role="status">
            <p>{isPending?'Loading the family…':isError?'The wall couldn’t load.':'The wall is ready for its first brick.'}</p>
            {isError && <button type="button" className="gj-cta gj-cta--quiet" onClick={()=>void refetch()}>Try again</button>}
          </main>
        )}
        {/* Main Interaction Area */}
        <div className="family-join-scene" hidden={showWallOnly} inert={showWallOnly||arrivalActive} aria-hidden={showWallOnly||arrivalActive||undefined} data-handoff={handoff.phase} data-celebrated={celebrationPlayed}>
        <div className="family-handoff-shade" aria-hidden="true" />
        {handoff.phase==='submitting' && <p className="sr-only" role="status">Adding your brick…</p>}
        {handoff.phase!=='welcome' && <div ref={handoff.formLayer} className="family-form-layer" inert={handoff.phase!=='form'} aria-hidden={handoff.phase!=='form'||undefined}>
          <main className="brick-stage pointer-events-auto">
            <JoinForm onJoin={handleJoin} onExistingMember={handleExistingMember} onWallOnly={()=>{setShowWallOnly(true);requestAnimationFrame(()=>document.querySelector<HTMLElement>(".family-wall-intro h1")?.focus({preventScroll:true}));}}
              onSubmitStart={handoff.hold} onSubmitError={handoff.restore} leaving={hasSubmitted}/>
          </main>
        </div>}

        {showInstagramInvitation && latestMember && handoff.phase==='welcome' && (
          <WelcomeBrick member={latestMember} existing={isExistingMember} publicRecords={familyMembers} dataReady={isFetched}
            playCelebration={!celebrationPlayed} onCelebrationComplete={handleCelebrationComplete}
            loadFreshRecords={() => queryClient.fetchQuery({queryKey:["members"],queryFn:fetchMembers,staleTime:0})}
            onSave={handleExportAndSaveTile} saving={savingBrick} error={downloadError} />
        )}
        </div>

        {/* The chooser owns its side-by-side secondary controls. */}
        <footer className={`brick-wall-footer mt-auto w-full p-6 text-center pointer-events-auto flex flex-col items-center gap-4 ${!showWallOnly&&!hasSubmitted?"brick-footer-reserved":""} ${!showWallOnly&&hasSubmitted&&handoff.phase!=='welcome'?"brick-footer-entering":""}`} inert={arrivalActive||(!showWallOnly&&hasSubmitted&&handoff.phase!=='welcome')}>
          {(showWallOnly || (hasSubmitted&&handoff.phase==='welcome')) &&
          <button
            onClick={() => {
              if (arrivalLock.current) return;
              if (!showWallOnly && hasSubmitted && latestMember && handoff.phase==="welcome") {
                arrivalLock.current = true;
                const host = pageRef.current?.querySelector<HTMLElement>(".welcome-brick-host");
                const source = host?.getBoundingClientRect() ?? null;
                setArrivalMember(latestMember);
                setHighlightedMemberId(latestMember.id);
                setArrivalPhase("isolate");
                setArrival({member:latestMember,source:source?.width ? source : null});
                return;
              }
              const newShowWallOnly = !showWallOnly;
              setShowWallOnly(newShowWallOnly);
              if (!newShowWallOnly && latestMember) setShowInstagramInvitation(true);
              requestAnimationFrame(()=>document.querySelector<HTMLElement>(newShowWallOnly ? ".family-wall-intro h1" : hasSubmitted ? ".welcome-content h1" : ".brick-heading h1")?.focus({preventScroll:true}));
            }}
            className={`gj-cta family-secondary-action brick-wall-toggle${showWallOnly && !hasSubmitted ? " family-primary-action" : " family-wall-invite"}`}
            data-testid="button-toggle-wall"
          >
            <span className="brick-button-label">{showWallOnly ? (hasSubmitted ? "Back to your brick" : "Create your brick →") : "See the family"}</span>
          </button>}
        </footer>
      </div>
      {arrival && arrivalPhase!=="hold" && <>
        <div className="family-arrival-shade" aria-hidden="true" />
        {arrival.source && <div ref={arrivalBrick} className="family-arrival-brick" aria-hidden="true" style={{left:arrival.source.left,top:arrival.source.top,width:arrival.source.width,height:arrival.source.height}}><Badge title={arrival.member.title} name={arrival.member.name}/></div>}
      </>}
    </div>
  );
}
