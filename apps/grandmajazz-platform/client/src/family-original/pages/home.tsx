import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WelcomeBrick } from "@/family-original/components/WelcomeBrick";
import { JoinForm } from "@/family-original/components/JoinForm";
import { BrickButtonFrame } from "@/family-original/components/BrickButtonFrame";
import { FamilyMember } from "@/family-original/lib/mockData";
import { apiUrl } from "@/family-original/lib/api";

import { Wall } from "@/family-original/components/Wall";

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
  const qs = new URLSearchParams({ title, name, artwork: "badge-v1" }).toString();
  return apiUrl(`/api/brick.png?${qs}`);
}

export default function Home() {
  const queryClient = useQueryClient();
  const [downloadError, setDownloadError] = useState("");
  const [savingBrick, setSavingBrick] = useState(false);
  const saveLock = useRef(false);
  const [newestMemberId, setNewestMemberId] = useState<string | null>(null);
  const [showInstagramInvitation, setShowInstagramInvitation] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [latestMember, setLatestMember] = useState<FamilyMember | null>(null);
  const [flyByMember, setFlyByMember] = useState<FamilyMember | null>(null);
  const [showWallOnly, setShowWallOnly] = useState(false);
  const [presentationReady, setPresentationReady] = useState(false);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);
  const [isExistingMember, setIsExistingMember] = useState(false);

  const { data: familyMembers = [], isFetched } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Freeze the first public wall snapshot through the intro; refetches cannot reshuffle it.
  const wallSnapshot = useRef<FamilyMember[] | null>(null);
  if (isFetched && familyMembers.length > 0 && wallSnapshot.current === null) wallSnapshot.current = familyMembers;

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
    await addMemberMutation.mutateAsync(member);
  };

  const handleExistingMember = (member: FamilyMember) => {
    setLatestMember(member);
    setIsExistingMember(true);
    setHasSubmitted(true);
    setHighlightedMemberId(member.id);
    setShowInstagramInvitation(true);
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
    <div className="family-page relative w-full min-h-dvh overflow-x-clip bg-black text-white selection:bg-white selection:text-black">
      {/* Keep the actual wall mounted from the first frame. */}
        <Wall
          members={hasSubmitted ? familyMembers : (wallSnapshot.current || familyMembers)}
          newestMemberId={newestMemberId}
          highlightedMemberId={highlightedMemberId}
          flyByMember={flyByMember}
        />

      {/* Foreground Content */}
      <div className="family-foreground relative z-10 w-full min-h-dvh flex flex-col items-center pointer-events-none">
        {/* Main Interaction Area */}
        {!showWallOnly && !hasSubmitted && (
          <main className="brick-stage pointer-events-auto">
            <JoinForm onJoin={handleJoin} onExistingMember={handleExistingMember} publicRecords={familyMembers} dataReady={isFetched} loadFreshRecords={() => queryClient.fetchQuery({queryKey:["members"],queryFn:fetchMembers,staleTime:0})} onPresentationReadyChange={setPresentationReady} />
          </main>
        )}

        {!showWallOnly && showInstagramInvitation && latestMember && (
          <WelcomeBrick member={latestMember} existing={isExistingMember}
            onSave={handleExportAndSaveTile} saving={savingBrick} error={downloadError} />
        )}

        {/* Keep the wall toggle unavailable until the editable brick is ready. */}
        <footer className="brick-wall-footer mt-auto w-full p-6 text-center pointer-events-auto flex flex-col items-center gap-4">
          {(showWallOnly || hasSubmitted || presentationReady) &&
          <button
            onClick={() => {
              const newShowWallOnly = !showWallOnly;
              setShowWallOnly(newShowWallOnly);
              if (!newShowWallOnly && latestMember) setShowInstagramInvitation(true);
            }}
            className="brick-shape-button brick-wall-toggle font-sans tracking-wider text-xs cursor-pointer"
            data-testid="button-toggle-wall"
          >
            <BrickButtonFrame />
            <span className="brick-button-label">{showWallOnly ? (hasSubmitted ? "Your brick" : "Show form") : "Wall only"}</span>
          </button>}
        </footer>
      </div>
    </div>
  );
}
