import { useState, Suspense, lazy } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { JoinForm } from "@/components/JoinForm";
import { FamilyMember } from "@/lib/mockData";
import { apiUrl } from "@/lib/api";

const Wall = lazy(() => import("@/components/Wall").then(m => ({ default: m.Wall })));

async function fetchMembers(): Promise<FamilyMember[]> {
  const res = await fetch(apiUrl("/api/members"));
  if (!res.ok) throw new Error("Failed to fetch members");
  const data = await res.json();
  // Convert minified array format [id, title, name] to objects
  return data.map(([id, title, name]: [string, string, string]) => ({ id, title, name }));
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
  const qs = new URLSearchParams({ title, name }).toString();
  return apiUrl(`/api/brick.png?${qs}`);
}

export default function Home() {
  const queryClient = useQueryClient();
  const [newestMemberId, setNewestMemberId] = useState<string | null>(null);
  const [showInstagramInvitation, setShowInstagramInvitation] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [latestMember, setLatestMember] = useState<FamilyMember | null>(null);
  const [flyByMember, setFlyByMember] = useState<FamilyMember | null>(null);
  const [showWallOnly, setShowWallOnly] = useState(false);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);
  const [isExistingMember, setIsExistingMember] = useState(false);

  const { data: familyMembers = [] } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

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
      setFlyByMember(newMember);
      setShowInstagramInvitation(true);
    },
  });

  const handleJoin = async (member: Omit<FamilyMember, "id">) => {
    // Brick image is rendered server-side (node-canvas) and attached to the
    // welcome email by the API. Client just submits the member.
    addMemberMutation.mutate(member);
  };

  const handleExistingMember = (member: FamilyMember) => {
    setLatestMember(member);
    setIsExistingMember(true);
    setHasSubmitted(true);
    setHighlightedMemberId(member.id);
    setShowInstagramInvitation(true);
  };

  const handleExportAndSaveTile = async () => {
    if (!latestMember) return;
    // Server renders the high-res PNG (node-canvas, scale=4 → 3040x1040)
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
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-white selection:text-black">
      {/* Background Wall - Lazy loaded for faster initial page load */}
      <Suspense fallback={null}>
        <Wall
          members={familyMembers}
          newestMemberId={newestMemberId}
          highlightedMemberId={highlightedMemberId}
          flyByMember={flyByMember}
        />
      </Suspense>

      {/* Foreground Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
        {/* Header - hidden when wall only or welcome screen is showing */}
        {!showWallOnly && !showInstagramInvitation && (
          <header className="absolute top-0 left-0 right-0 p-6 md:p-12 text-center pointer-events-auto">
            <div className="flex justify-center mb-4">
              <div className="flex flex-col items-end justify-center w-[190px] h-[65px] border-2 border-white/90 rounded-[10px] bg-black text-white p-3">
                <span className="text-base md:text-lg font-galvji-light tracking-extra-wide text-right w-full px-1.5">Grandma</span>
                <span className="text-base md:text-lg font-galvji-light tracking-extra-wide text-right w-full px-1.5">Jazz</span>
              </div>
            </div>
          </header>
        )}

        {/* Main Interaction Area */}
        {!showWallOnly && !hasSubmitted && !addMemberMutation.isPending && (
          <main className="w-full max-w-4xl mx-auto p-4 pointer-events-auto">
            <JoinForm onJoin={handleJoin} onExistingMember={handleExistingMember} />
          </main>
        )}

        {/* Final Welcome Screen with Brick */}
        <AnimatePresence>
          {showInstagramInvitation && latestMember && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
            >
              <div className="flex flex-col items-center justify-center gap-6">
                {/* Large combined welcome tile with brick */}
                <motion.div
                  animate={{
                    scale: [1, 1.02, 1],
                    boxShadow: [
                      "0 0 30px rgba(255,255,255,0.3)",
                      "0 0 50px rgba(255,255,255,0.5)",
                      "0 0 30px rgba(255,255,255,0.3)"
                    ]
                  }}
                  transition={{
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="flex flex-col items-center justify-center bg-black px-10 py-8 border-2 border-white/90 rounded-[10px] min-w-[320px]"
                >
                  <span className="text-sm md:text-base font-sans font-light tracking-[0.2em] uppercase mb-4 opacity-70">
                    {isExistingMember ? "Welcome back to" : "Welcome to"}
                  </span>
                  <span className="text-2xl md:text-3xl font-galvji-light tracking-extra-wide mb-6">
                    The Family
                  </span>
                  <div className="w-full h-[1px] bg-white/30 mb-6"></div>
                  {/* User's brick displayed inside the welcome box */}
                  <div
                    className="flex flex-col items-end justify-center p-3 border-2 border-white/90 rounded-[10px] bg-black text-white w-[200px] h-[68px]"
                    data-testid="brick-welcome-display"
                  >
                    <span className="text-base md:text-lg font-galvji-light tracking-extra-wide text-right w-full px-1.5 leading-tight">
                      {latestMember.title}
                    </span>
                    <span className="text-base md:text-lg font-galvji-light tracking-extra-wide text-right w-full px-1.5">
                      {latestMember.name}
                    </span>
                  </div>
                </motion.div>

                {/* Discount instructions for new members only */}
                {!isExistingMember && (
                  <div className="text-left bg-black px-6 py-4 border-2 border-white/90 rounded-[10px] max-w-md">
                    <h3 className="text-base md:text-lg font-sans font-light tracking-wider mb-3">
                      To claim your 10% discount:
                    </h3>
                    <p className="text-sm font-sans font-light tracking-wide mb-1">① Walk up to the Budtender.</p>
                    <p className="text-sm font-sans font-light tracking-wide mb-1">② Say the phrase - "Thanks Grandma".</p>
                    <p className="text-sm font-sans font-light tracking-wide">③ Wink with one eye.</p>
                  </div>
                )}

                {/* Action buttons in brick-style container */}
                <div className="flex gap-6 p-4 border-2 border-white/90 rounded-[10px] bg-black pointer-events-auto">
                  <button
                    onClick={handleExportAndSaveTile}
                    className="flex flex-col items-center gap-2 p-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer group"
                    data-testid="button-save-brick"
                  >
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .9 2 2z"/>
                    </svg>
                    <span className="text-[10px] font-sans tracking-wide">save your brick</span>
                  </button>

                  <a
                    href="https://www.instagram.com/grandmajazzphuket"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer group"
                    data-testid="button-instagram-follow"
                  >
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-[10px] font-sans tracking-wide">follow us on instagram</span>
                  </a>

                  <a
                    href="https://www.grandmajazz.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer group"
                    data-testid="button-go-to-website"
                  >
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <span className="text-[10px] font-sans tracking-wide">Grandmajazz.com</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wall Only Button - always visible */}
        <footer className="absolute bottom-0 left-0 right-0 p-6 text-center pointer-events-auto flex flex-col items-center gap-4">
          <a href="/garments" target="_top" className="text-xs text-white/80 hover:text-white underline underline-offset-4">Garments</a>
          <button
            onClick={() => {
              const newShowWallOnly = !showWallOnly;
              setShowWallOnly(newShowWallOnly);
              if (newShowWallOnly) {
                setShowInstagramInvitation(false);
              }
            }}
            className="px-6 py-2 border-2 border-white/90 rounded-[10px] bg-black hover:bg-white hover:text-black transition-colors duration-300 font-sans uppercase tracking-wider text-xs cursor-pointer"
            data-testid="button-toggle-wall"
          >
            {showWallOnly ? "Show Form" : "Wall Only"}
          </button>
        </footer>
      </div>
    </div>
  );
}
