import { useState, useRef, useCallback, useEffect } from "react";
import { DUFU_POSES, dufuPortraitPath } from "../data/dufuPoses";

/**
 * SceneEditor - Visual drag-and-drop scene designer
 * Auto-discovers assets from your folder via import.meta.glob
 * Access via ?editor=true in URL
 */

// Auto-discover all background images from public/assets/events/ + legacy locations
const bgGlob = import.meta.glob(
  "/public/assets/events/**/*.{png,jpg,jpeg,webp}",
  { eager: true, query: "?url", import: "default" }
);
const BACKGROUNDS = Object.keys(bgGlob).map((k) => k.replace("/public", ""));

// Auto-discover all character portraits (shared NPCs live under /assets/characters/npcs/)
const charGlob = import.meta.glob("/public/assets/characters/**/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" });
const NPC_PORTRAITS = Object.keys(charGlob).map((k) => {
  const file = k.replace("/public", "");
  const name = file.split("/").pop().replace(/\.\w+$/, "");
  return { id: name, name, file };
});

// Auto-discover props/items (榜单、卷轴、酒坛……) — placeable like NPCs
const propGlob = import.meta.glob("/public/assets/props/**/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" });
const itemGlob = import.meta.glob("/public/assets/items/**/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" });
const PROP_NAMES = {
  boat_oar: "船桨", book_wenxuan: "《文选》", brush_inkstone: "笔砚", dafu_scroll: "大赋卷轴",
  helmet_broken: "破盔", letter_jiashu: "家书", medicine_bowl: "药碗", military_dispatch: "军报",
  paper_failed: "落第榜单", petition: "奏疏", scroll_imperial: "诏书", spear: "长枪",
  sword: "剑", thatched_roof_piece: "茅草", walking_stick: "拐杖", wine_cup: "酒杯",
  wine_cup_empty: "空酒杯", wine_jar: "酒坛",
  scroll_blank: "空白卷轴", paper_ball: "纸团", scroll_small: "小卷轴",
};
const PROP_PORTRAITS = Object.keys({ ...propGlob, ...itemGlob }).map((k) => {
  const file = k.replace("/public", "");
  const id = file.split("/").pop().replace(/\.\w+$/, "");
  return { id, name: PROP_NAMES[id] || id, file };
});

// Auto-discover event scenes from new folder structure: events/<id>/event.json
const sceneGlob = import.meta.glob("/src/data/dufu/events/*/event.json");
const SCENE_FILES = Object.keys(sceneGlob).map((k) => {
  // k like "/src/data/dufu/events/747_exam/event.json"
  const eventId = k.split("/").slice(-2, -1)[0];
  return { label: eventId, file: eventId, loader: sceneGlob[k], eventId };
});

export default function SceneEditor({ initialEventId, onExit }) {
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [npcs, setNpcs] = useState([]);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragStartPos, setDragStartPos] = useState(null);
  const [didDrag, setDidDrag] = useState(false);
  const [phaseType, setPhaseType] = useState("explore");
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseNarrative, setPhaseNarrative] = useState("");
  const [phaseInstruction, setPhaseInstruction] = useState("");
  // Du Fu pose for this phase ("" = auto by event year)
  const [phaseDufuPose, setPhaseDufuPose] = useState("");
  const [npcSize, setNpcSize] = useState(140);
  const sceneRef = useRef(null);
  // Scene/phase selection
  const [currentSceneFile, setCurrentSceneFile] = useState("");
  const [sceneData, setSceneData] = useState(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  // Trigger zones (continue buttons, scene portals)
  const [triggerZones, setTriggerZones] = useState([]);

  // Add a "continue" button trigger
  const addTriggerZone = () => {
    const trigger = {
      id: "trigger_" + Date.now(),
      type: "continue",
      label: "继续 →",
      x: 50,
      y: 25,
      radius: 8,
    };
    setTriggerZones([...triggerZones, trigger]);
  };

  // Add a scene portal trigger
  const addScenePortal = () => {
    const portal = {
      id: "portal_" + Date.now(),
      type: "portal",
      label: "进入下一场景",
      x: 50,
      y: 50,
      radius: 8,
      targetPhase: "",
    };
    setTriggerZones([...triggerZones, portal]);
  };

  // Add text-only label (no portrait)
  const addTextLabel = () => {
    const newNpc = {
      id: "label_" + Date.now(),
      npcId: "label_" + Date.now(),
      name: "文字标签",
      portrait: "",
      x: 50,
      y: 50,
      scale: 1,
      flip: false,
      isClue: false,
      dialogues: [{ speaker: "narrator", speakerName: "旁白", text: "" }],
    };
    setNpcs([...npcs, newNpc]);
    setSelectedNpc(newNpc.id);
  };

  // Add prop/item from palette (narrated object, e.g. 榜单/卷轴)
  const addProp = (prop) => {
    const newNpc = {
      id: prop.id + "_" + Date.now(),
      npcId: prop.id,
      name: prop.name,
      portrait: prop.file,
      x: 50,
      y: 50,
      scale: 1,
      flip: false,
      isClue: false,
      dialogues: [{ speaker: "narrator", speakerName: "旁白", text: "" }],
    };
    setNpcs([...npcs, newNpc]);
    setSelectedNpc(newNpc.id);
  };

  // Add NPC from palette
  const addNpc = (portrait) => {
    const newNpc = {
      id: portrait.id + "_" + Date.now(),
      npcId: portrait.id,
      name: portrait.name,
      portrait: portrait.file,
      x: 50,
      y: 50,
      scale: 1,
      flip: false,
      isClue: false,
      dialogues: [{ speaker: portrait.id, speakerName: portrait.name, text: "" }],
    };
    setNpcs([...npcs, newNpc]);
    setSelectedNpc(newNpc.id);
  };

  // Load a scene file
  const loadSceneFile = async (filename) => {
    const entry = SCENE_FILES.find((s) => s.file === filename);
    if (!entry) return;
    try {
      const mod = await entry.loader();
      const data = mod.default;
      setSceneData(data);
      setCurrentSceneFile(filename);
      setCurrentPhaseIndex(0);
      loadPhase(data, 0);
    } catch (err) {
      console.error("Failed to load scene:", err);
    }
  };

  // Auto-load when an initial event is passed in from the timeline editor.
  useEffect(() => {
    if (initialEventId && !currentSceneFile) {
      loadSceneFile(initialEventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEventId]);

  const loadPhase = (data, idx) => {
    const phases = data.phases || [];
    if (idx >= phases.length) return;
    const phase = phases[idx];
    if (phase.background) setBg(phase.background);
    setPhaseId(phase.id || "");
    setPhaseTitle(phase.title || "");
    setPhaseNarrative(phase.narrative || "");
    setPhaseInstruction(phase.instruction || "");
    setPhaseType(phase.type || "explore");
    setNextPhase(phase.nextPhase || "");
    if (phase.npcs) {
      setNpcs(
        phase.npcs.map((n, i) => ({
          id: n.id + "_" + i,
          npcId: n.id,
          name: n.name,
          portrait: n.portrait,
          x: n.position?.x ?? 50,
          y: n.position?.y ?? 50,
          scale: n.scale ?? 1,
          flip: n.flip ?? false,
          rotate: n.rotate ?? 0,
          tiltX: n.tiltX ?? 0,
          tiltY: n.tiltY ?? 0,
          perspective: n.perspective ?? 0,
          isClue: n.isClue || false,
          dialogues: n.dialogues || [{ speaker: n.id, speakerName: n.name, text: "" }],
        }))
      );
    } else {
      setNpcs([]);
    }
    setSelectedNpc(null);
    // Load trigger zones — new format first, fallback to legacy nextTrigger
    const zones = [];
    if (phase.triggers) {
      phase.triggers.forEach((t, i) => {
        zones.push({
          id: "trigger_" + i,
          type: t.type || "continue",
          label: t.label || "继续 →",
          x: t.area?.x ?? 50,
          y: t.area?.y ?? 50,
          radius: t.area?.radius ?? 8,
          action: t.action || "next_phase",
          condition: t.condition || "always",
          targetPhase: t.targetPhase || "",
          targetScene: t.targetScene || "",
          dialogueText: t.dialogueText || "",
        });
      });
    } else if (phase.nextTrigger) {
      zones.push({
        id: "trigger_main",
        type: "continue",
        label: phase.nextTrigger.label || "继续 →",
        x: phase.nextTrigger.area?.x ?? 50,
        y: phase.nextTrigger.area?.y ?? 25,
        radius: phase.nextTrigger.area?.radius ?? 8,
        action: "next_phase",
        condition: "all_talked",
      });
    }
    setTriggerZones(zones);
    loadPhaseExtended(phase);
  };

  const switchPhase = (idx) => {
    if (!sceneData) return;
    // Save current edits back to sceneData before switching
    saveCurrentPhaseToScene();
    setCurrentPhaseIndex(idx);
    loadPhase(sceneData, idx);
  };

  // Save current editor state back into sceneData.phases[currentPhaseIndex]
  const saveCurrentPhaseToScene = () => {
    if (!sceneData) return;
    setSceneData((prev) => {
      const updated = { ...prev, phases: [...prev.phases] };
      const phase = {
        ...updated.phases[currentPhaseIndex],
        id: phaseId || updated.phases[currentPhaseIndex].id,
        background: bg,
        title: phaseTitle,
        narrative: phaseNarrative,
        type: phaseType,
        ...(nextPhase ? { nextPhase } : {}),
      };
      if (phaseDufuPose) phase.dufu_pose = phaseDufuPose;
      else delete phase.dufu_pose;
      if (phaseType === "explore") {
        phase.instruction = phaseInstruction;
        phase.npcs = npcs.map((n) => ({
          id: n.npcId, name: n.name, portrait: n.portrait,
          position: { x: n.x, y: n.y },
          ...(n.scale !== 1 ? { scale: n.scale } : {}),
          ...(n.flip ? { flip: true } : {}),
          ...(n.rotate ? { rotate: n.rotate } : {}),
          ...(n.tiltX ? { tiltX: n.tiltX } : {}),
          ...(n.tiltY ? { tiltY: n.tiltY } : {}),
          ...(n.perspective ? { perspective: n.perspective } : {}),
          ...(n.isClue ? { isClue: true } : {}),
          dialogues: n.dialogues,
        }));
        phase.requiredTalks = Math.min(npcs.length, 3);
        // Save trigger zones
        if (triggerZones.length > 0) {
          phase.triggers = triggerZones.map(t => ({
            type: t.type,
            label: t.label,
            area: { x: t.x, y: t.y, radius: t.radius || 8 },
            action: t.action || "next_phase",
            condition: t.condition || "always",
            ...(t.targetPhase ? { targetPhase: t.targetPhase } : {}),
            ...(t.targetScene ? { targetScene: t.targetScene } : {}),
            ...(t.dialogueText ? { dialogueText: t.dialogueText } : {}),
          }));
          // Also write nextTrigger for backward compatibility with ScenePlayer
          const mainTrigger = triggerZones[0];
          phase.nextTrigger = {
            type: "position",
            area: { x: mainTrigger.x, y: mainTrigger.y, radius: mainTrigger.radius || 8 },
            label: mainTrigger.label || "继续 →",
          };
        } else {
          delete phase.triggers;
          delete phase.nextTrigger;
        }
      }
      if (phaseType === "exam") {
        phase.questions = questions;
        if (examinerPortrait || examinerName) {
          phase.examiner = {
            portrait: examinerPortrait,
            name: examinerName,
          };
        }
      }
      if (phaseType === "transition") {
        phase.transitionText = transitionText;
        if (announcementText) phase.announcement = { text: announcementText, style: "imperial_decree" };
        if (dufuReactionText) phase.dufu_reaction = { portrait: dufuPortraitPath(phaseDufuPose, updated.year), text: dufuReactionText };
      }
      if (phaseType === "forced_choice") {
        phase.question = choiceQuestion;
        phase.options = choiceOptions;
        if (conclusionNarrative) phase.conclusion = { narrative: conclusionNarrative };
      }
      if (phaseType === "poem_compose") {
        phase.poemContext = poemContext;
        phase.poemAnswer = poemAnswer;
        phase.poemCandidates = poemCandidates;
        if (poemExplanation) phase.poemExplanation = poemExplanation;
      }
      if (phaseType === "map_travel") {
        // Player reads `waypoints` — write that, and drop the legacy key.
        phase.waypoints = destinations.map(({ uid, ...rest }) => rest);
        delete phase.destinations;
        phase.travelNarrative = travelNarrative;
      }
      if (phaseType === "dialogue_branch") {
        phase.branchCharacter = branchCharacter;
        phase.dialogueTree = dialogueTree;
      }
      if (phaseType === "narration") {
        phase.narrationSlides = narrationSlides;
      }
      if (phaseType === "escape_game") {
        phase.gridW = egGridW;
        phase.gridH = egGridH;
        phase.tickMs = egTickMs;
        phase.start = egStart;
        phase.end = egEnd;
        phase.cells = egCells;
        phase.arrows = egArrows;
        phase.gates = egGates;
        phase.guards = egGuards;
        phase.soldierPortraits = egSoldierPortraits;
        phase.playerPortrait = egPlayerPortrait;
      }
      if (phaseType === "click_points") {
        phase.instruction = phaseInstruction;
        phase.image = clickPointImage || bg;
        phase.unlockThreshold = unlockThreshold;
        phase.progressivePoem = progressivePoem;
        phase.points = clickPoints.map((p) => ({
          id: p.id,
          label: p.label,
          position: { x: p.x, y: p.y },
          size: p.size,
          text: p.text,
        }));
      }
      if (phaseType === "minigame") {
        phase.minigameType = minigameType;
        phase.minigameItems = minigameItems;
        phase.minigameInstruction = minigameInstruction;
      }
      updated.phases[currentPhaseIndex] = phase;
      return updated;
    });
  };

  // Add a new phase
  const addPhase = () => {
    const newPhase = {
      id: "new_phase_" + Date.now(),
      type: "explore",
      background: BACKGROUNDS[0] || "",
      title: "\u65B0\u573A\u666F",
      narrative: "",
      instruction: "",
      npcs: [],
    };
    if (!sceneData) {
      // Create new scene from scratch
      setSceneData({
        id: "new_scene",
        title: "\u65B0\u573A\u666F",
        year: "",
        type: "interactive",
        phases: [newPhase],
      });
      setCurrentSceneFile("\u65B0\u573A\u666F");
      setCurrentPhaseIndex(0);
      loadPhase({ phases: [newPhase] }, 0);
    } else {
      saveCurrentPhaseToScene();
      setSceneData((prev) => ({
        ...prev,
        phases: [...prev.phases, newPhase],
      }));
      const newIdx = sceneData.phases.length;
      setCurrentPhaseIndex(newIdx);
      loadPhase({ phases: [...sceneData.phases, newPhase] }, newIdx);
    }
  };

  // Delete current phase
  const deletePhase = () => {
    if (!sceneData || sceneData.phases.length <= 1) return;
    setSceneData((prev) => {
      const updated = { ...prev, phases: prev.phases.filter((_, i) => i !== currentPhaseIndex) };
      const newIdx = Math.max(0, currentPhaseIndex - 1);
      setCurrentPhaseIndex(newIdx);
      setTimeout(() => loadPhase(updated, newIdx), 0);
      return updated;
    });
  };

  // Export full scene (all phases)
  const exportFullScene = () => {
    saveCurrentPhaseToScene();
    // Need to use a timeout to let state settle
    return sceneData ? JSON.stringify(sceneData, null, 2) : "{}";
  };

  // Drag handling — only starts dragging after mouse moves 5px
  const handleMouseDown = (e, npcId) => {
    e.stopPropagation();
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragging(npcId);
    setDidDrag(false);
    setSelectedNpc(npcId);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !sceneRef.current) return;
    if (!didDrag && dragStartPos) {
      const dx = Math.abs(e.clientX - dragStartPos.x);
      const dy = Math.abs(e.clientY - dragStartPos.y);
      if (dx < 5 && dy < 5) return; // not dragging yet
      setDidDrag(true);
    }
    const rect = sceneRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampX = Math.max(0, Math.min(100, Math.round(x)));
    const clampY = Math.max(0, Math.min(100, Math.round(y)));
    // Update NPC or trigger zone position
    setNpcs((prev) =>
      prev.map((n) =>
        n.id === dragging ? { ...n, x: clampX, y: clampY } : n
      )
    );
    setTriggerZones((prev) =>
      prev.map((t) =>
        t.id === dragging ? { ...t, x: clampX, y: clampY } : t
      )
    );
    setClickPoints((prev) =>
      prev.map((p) =>
        p.uid === dragging ? { ...p, x: clampX, y: clampY } : p
      )
    );
    setDestinations((prev) =>
      prev.map((d) =>
        d.uid === dragging ? { ...d, x: clampX, y: clampY } : d
      )
    );
  }, [dragging, didDrag, dragStartPos]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setDragStartPos(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Update NPC dialogue
  const updateNpcField = (npcId, field, value) => {
    setNpcs((prev) => prev.map((n) => (n.id === npcId ? { ...n, [field]: value } : n)));
  };

  const updateDialogue = (npcId, dIdx, field, value) => {
    setNpcs((prev) =>
      prev.map((n) => {
        if (n.id !== npcId) return n;
        const newDialogues = [...n.dialogues];
        newDialogues[dIdx] = { ...newDialogues[dIdx], [field]: value };
        return { ...n, dialogues: newDialogues };
      })
    );
  };

  const addDialogue = (npcId) => {
    setNpcs((prev) =>
      prev.map((n) => {
        if (n.id !== npcId) return n;
        return { ...n, dialogues: [...n.dialogues, { speaker: n.npcId, speakerName: n.name, text: "" }] };
      })
    );
  };

  const removeDialogue = (npcId, dIdx) => {
    setNpcs((prev) =>
      prev.map((n) => {
        if (n.id !== npcId) return n;
        const newDialogues = n.dialogues.filter((_, i) => i !== dIdx);
        return { ...n, dialogues: newDialogues.length ? newDialogues : [{ speaker: n.npcId, speakerName: n.name, text: "" }] };
      })
    );
  };

  const removeNpc = (npcId) => {
    setNpcs((prev) => prev.filter((n) => n.id !== npcId));
    if (selectedNpc === npcId) setSelectedNpc(null);
  };

  // === Phase flow state ===
  const [phaseId, setPhaseId] = useState("");
  const [nextPhase, setNextPhase] = useState("");

  // === Exam questions state ===
  const [questions, setQuestions] = useState([]);
  const [examinerPortrait, setExaminerPortrait] = useState("");
  const [examinerName, setExaminerName] = useState("");

  // === Transition state ===
  const [transitionText, setTransitionText] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [dufuReactionText, setDufuReactionText] = useState("");

  // === Forced choice state ===
  const [choiceQuestion, setChoiceQuestion] = useState("");
  const [choiceOptions, setChoiceOptions] = useState([]);
  const [conclusionNarrative, setConclusionNarrative] = useState("");

  // === Poem compose state ===
  const [poemContext, setPoemContext] = useState("");
  const [poemAnswer, setPoemAnswer] = useState("");
  const [poemCandidates, setPoemCandidates] = useState([]);
  const [poemExplanation, setPoemExplanation] = useState("");

  // === Map travel state ===
  const [destinations, setDestinations] = useState([]);
  const [travelNarrative, setTravelNarrative] = useState("");

  // === Dialogue branch state ===
  const [dialogueTree, setDialogueTree] = useState([]);
  const [branchCharacter, setBranchCharacter] = useState("");

  // === Narration state ===
  const [narrationSlides, setNarrationSlides] = useState([]);

  // === Minigame state ===
  const [minigameType, setMinigameType] = useState("memory");
  const [minigameItems, setMinigameItems] = useState([]);
  const [minigameInstruction, setMinigameInstruction] = useState("");

  // === Click-points state (春望-style 找茬 phase) ===
  const [clickPoints, setClickPoints] = useState([]);
  const [selectedClickPoint, setSelectedClickPoint] = useState(null);
  const [clickPointImage, setClickPointImage] = useState("");
  const [progressivePoem, setProgressivePoem] = useState([]);
  const [unlockThreshold, setUnlockThreshold] = useState(3);

  // === Escape-game state (Pac-Man-ish 长安出城 phase) ===
  const [egGridW, setEgGridW] = useState(13);
  const [egGridH, setEgGridH] = useState(14);
  const [egTickMs, setEgTickMs] = useState(350);
  const [egStart, setEgStart] = useState({ x: 6, y: 13 });
  const [egEnd, setEgEnd] = useState({ x: 0, y: 7 });
  const [egCells, setEgCells] = useState([]);    // labeled blocking buildings
  const [egArrows, setEgArrows] = useState([]);  // directional patrol tiles
  const [egGates, setEgGates] = useState([]);    // street-cell gate labels
  const [egGuards, setEgGuards] = useState([]);
  const [egSoldierPortraits, setEgSoldierPortraits] = useState([]);
  const [egPlayerPortrait, setEgPlayerPortrait] = useState(""); // "" = auto (stage default by year)
  // Editor brush: what does clicking a cell do?
  const [egBrush, setEgBrush] = useState("toggle_block");
  const [egArrowDir, setEgArrowDir] = useState("right");
  // Currently-selected building cell (for label/size edits)
  const [egSelCell, setEgSelCell] = useState(null);

  // Extend loadPhase to load all phase types
  const loadPhaseExtended = (phase) => {
    // Exam
    setQuestions(phase.questions || []);
    setExaminerPortrait(phase.examiner?.portrait || "");
    setExaminerName(phase.examiner?.name || "");
    // Transition
    setTransitionText(phase.transitionText || "");
    setAnnouncementText(phase.announcement?.text || "");
    setDufuReactionText(phase.dufu_reaction?.text || "");
    // Du Fu pose
    setPhaseDufuPose(phase.dufu_pose || "");
    // Forced choice
    setChoiceQuestion(phase.question || "");
    setChoiceOptions(phase.options || []);
    setConclusionNarrative(phase.conclusion?.narrative || "");
    // Poem compose
    setPoemContext(phase.poemContext || "");
    setPoemAnswer(phase.poemAnswer || "");
    setPoemCandidates(phase.poemCandidates || []);
    setPoemExplanation(phase.poemExplanation || "");
    // Map travel — data uses `waypoints`; `destinations` is a legacy editor key.
    setDestinations(((phase.waypoints && phase.waypoints.length ? phase.waypoints : phase.destinations) || []).map((d, i) => ({
      ...d,
      uid: "wp_" + i + "_" + (d.id || ""),
      dialogues: d.dialogues || [],
    })));
    setTravelNarrative(phase.travelNarrative || "");
    // Dialogue branch
    setDialogueTree(phase.dialogueTree || []);
    setBranchCharacter(phase.branchCharacter || "");
    // Narration
    setNarrationSlides(phase.narrationSlides || []);
    // Minigame
    setMinigameType(phase.minigameType || "memory");
    setMinigameItems(phase.minigameItems || []);
    setMinigameInstruction(phase.minigameInstruction || "");
    // Click points
    setClickPoints((phase.points || []).map((p, i) => ({
      uid: (p.id || "pt") + "_" + i,
      id: p.id || ("pt_" + i),
      label: p.label || "",
      x: p.position?.x ?? 50,
      y: p.position?.y ?? 50,
      size: p.size ?? 64,
      text: p.text || "",
    })));
    setSelectedClickPoint(null);
    setClickPointImage(phase.image || phase.background || "");
    setProgressivePoem(phase.progressivePoem || []);
    setUnlockThreshold(phase.unlockThreshold ?? 3);
    // Escape game
    setEgGridW(phase.gridW ?? 13);
    setEgGridH(phase.gridH ?? 14);
    setEgTickMs(phase.tickMs ?? 350);
    setEgStart(phase.start ?? { x: 0, y: 0 });
    setEgEnd(phase.end ?? { x: 0, y: 0 });
    setEgCells(phase.cells ?? []);
    setEgArrows(phase.arrows ?? []);
    setEgGates(phase.gates ?? []);
    setEgGuards(phase.guards ?? []);
    setEgSoldierPortraits(phase.soldierPortraits ?? []);
    setEgPlayerPortrait(phase.playerPortrait ?? "");
    setEgSelCell(null);
  };

  // Export JSON — builds full phase based on type
  const exportJSON = () => {
    const phase = {
      id: phaseId || phaseTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") || "phase_1",
      type: phaseType,
      background: bg,
      title: phaseTitle,
      narrative: phaseNarrative,
      ...(nextPhase ? { nextPhase } : {}),
      ...(phaseDufuPose ? { dufu_pose: phaseDufuPose } : {}),
    };
    if (phaseType === "explore") {
      phase.instruction = phaseInstruction;
      phase.npcs = npcs.map((n) => ({
        id: n.npcId,
        name: n.name,
        portrait: n.portrait,
        position: { x: n.x, y: n.y },
        ...(n.scale !== 1 ? { scale: n.scale } : {}),
        ...(n.flip ? { flip: true } : {}),
        ...(n.rotate ? { rotate: n.rotate } : {}),
        ...(n.tiltX ? { tiltX: n.tiltX } : {}),
        ...(n.tiltY ? { tiltY: n.tiltY } : {}),
        ...(n.perspective ? { perspective: n.perspective } : {}),
        ...(n.isClue ? { isClue: true } : {}),
        dialogues: n.dialogues,
      }));
      phase.requiredTalks = Math.min(npcs.length, 3);
    }
    if (phaseType === "exam") {
      phase.questions = questions;
      if (examinerPortrait || examinerName) {
        phase.examiner = {
          portrait: examinerPortrait,
          name: examinerName,
        };
      }
    }
    if (phaseType === "transition") {
      phase.transitionText = transitionText;
      if (announcementText) phase.announcement = { text: announcementText, style: "imperial_decree" };
      if (dufuReactionText) phase.dufu_reaction = { portrait: dufuPortraitPath(phaseDufuPose, sceneData?.year), text: dufuReactionText };
    }
    if (phaseType === "forced_choice") {
      phase.question = choiceQuestion;
      phase.options = choiceOptions;
      if (conclusionNarrative) phase.conclusion = { narrative: conclusionNarrative };
    }
    if (phaseType === "poem_compose") {
      phase.poemContext = poemContext;
      phase.poemAnswer = poemAnswer;
      phase.poemCandidates = poemCandidates;
      if (poemExplanation) phase.poemExplanation = poemExplanation;
    }
    if (phaseType === "map_travel") {
      phase.waypoints = destinations.map(({ uid, ...rest }) => rest);
      phase.travelNarrative = travelNarrative;
    }
    if (phaseType === "dialogue_branch") {
      phase.branchCharacter = branchCharacter;
      phase.dialogueTree = dialogueTree;
    }
    if (phaseType === "narration") {
      phase.narrationSlides = narrationSlides;
    }
    if (phaseType === "escape_game") {
      phase.gridW = egGridW;
      phase.gridH = egGridH;
      phase.tickMs = egTickMs;
      phase.start = egStart;
      phase.end = egEnd;
      phase.cells = egCells;
      phase.arrows = egArrows;
      phase.gates = egGates;
      phase.guards = egGuards;
      phase.soldierPortraits = egSoldierPortraits;
      phase.playerPortrait = egPlayerPortrait;
    }
    if (phaseType === "click_points") {
      phase.instruction = phaseInstruction;
      phase.image = clickPointImage || bg;
      phase.unlockThreshold = unlockThreshold;
      phase.progressivePoem = progressivePoem;
      phase.points = clickPoints.map((p) => ({
        id: p.id,
        label: p.label,
        position: { x: p.x, y: p.y },
        size: p.size,
        text: p.text,
      }));
    }
    if (phaseType === "minigame") {
      phase.minigameType = minigameType;
      phase.minigameItems = minigameItems;
      phase.minigameInstruction = minigameInstruction;
    }
    return JSON.stringify(phase, null, 2);
  };

  // Save directly to file \u2014 writes to events/<eventId>/event.json
  const [saveStatus, setSaveStatus] = useState("");
  const saveToFile = async () => {
    saveCurrentPhaseToScene();
    const eventId = currentSceneFile || (sceneData && sceneData.id) || "new_event";
    // Wait a tick for state to settle
    await new Promise((r) => setTimeout(r, 50));
    const content = JSON.stringify(sceneData, null, 2);
    try {
      const res = await fetch("/api/save-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, content }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveStatus("\u2705 \u5DF2\u4FDD\u5B58 \u2192 " + data.path.split("/").slice(-3).join("/"));
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus("\u274C " + data.error);
      }
    } catch (err) {
      setSaveStatus("\u274C " + err.message);
    }
  };

  // Import JSON
  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      if (data.background) setBg(data.background);
      if (data.title) setPhaseTitle(data.title);
      if (data.narrative) setPhaseNarrative(data.narrative);
      if (data.instruction) setPhaseInstruction(data.instruction);
      if (data.type) setPhaseType(data.type);
      if (data.npcs) {
        setNpcs(
          data.npcs.map((n, i) => ({
            id: n.id + "_" + i,
            npcId: n.id,
            name: n.name,
            portrait: n.portrait,
            x: n.position?.x ?? 50,
            y: n.position?.y ?? 50,
            isClue: n.isClue || false,
            dialogues: n.dialogues || [{ speaker: n.id, speakerName: n.name, text: "" }],
          }))
        );
      }
      setShowImport(false);
      setImportText("");
    } catch {
      alert("JSON \u89E3\u6790\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u683C\u5F0F");
    }
  };

  const selected = npcs.find((n) => n.id === selectedNpc);

  return (
    <div style={styles.editor}>
      {/* Top toolbar row 1: scene/phase selection */}
      <div style={styles.toolbar}>
        <h2 style={styles.toolbarTitle}>{"\u{1F3A8} \u573A\u666F\u7F16\u8F91\u5668"}</h2>
        <div style={styles.toolbarGroup}>
          <label style={styles.label}>{"\u573A\u666F\u6587\u4EF6:"}</label>
          <select
            value={currentSceneFile}
            onChange={(e) => { if (e.target.value) loadSceneFile(e.target.value); }}
            style={{ ...styles.select, fontWeight: "bold", minWidth: 160 }}
          >
            <option value="">{"-- \u9009\u62E9\u573A\u666F --"}</option>
            {SCENE_FILES.map((s) => (
              <option key={s.file} value={s.file}>{s.label}</option>
            ))}
          </select>
        </div>
        {sceneData && sceneData.phases && (
          <div style={styles.toolbarGroup}>
            <label style={styles.label}>{"\u9636\u6BB5:"}</label>
            <div style={styles.phaseTabs}>
              {sceneData.phases.map((p, i) => (
                <button
                  key={p.id + i}
                  style={{
                    ...styles.phaseTab,
                    backgroundColor: i === currentPhaseIndex ? "#F4D03F" : "#2C3E50",
                    color: i === currentPhaseIndex ? "#1a1a2e" : "#AAB7C4",
                  }}
                  onClick={() => switchPhase(i)}
                >
                  {(i + 1) + ". " + (p.title || p.id)}
                </button>
              ))}
            </div>
          </div>
        )}
        <button style={styles.btnAddPhase} onClick={addPhase}>
          {"+ \u65B0\u589E\u9636\u6BB5"}
        </button>
        {sceneData && sceneData.phases && sceneData.phases.length > 1 && (
          <button style={styles.btnDeletePhase} onClick={deletePhase}>
            {"\u2715 \u5220\u9664\u5F53\u524D\u9636\u6BB5"}
          </button>
        )}
        {onExit ? (
          <button style={styles.btnBack} onClick={onExit}>
            {"\u2190 \u8FD4\u56DE\u65F6\u95F4\u7EBF"}
          </button>
        ) : (
          <button style={styles.btnBack} onClick={() => { window.location.search = ""; }}>
            {"\u2190 \u8FD4\u56DE\u6E38\u620F"}
          </button>
        )}
      </div>

      {/* Top toolbar row 2: editing tools */}
      <div style={styles.toolbar2}>
        {currentSceneFile && (
          <span style={styles.editingLabel}>
            {"\u{1F4DD} \u6B63\u5728\u7F16\u8F91: "}{currentSceneFile}{" \u2192 "}{phaseTitle || "(untitled)"}
          </span>
        )}
        <div style={styles.toolbarGroup}>
          <label style={styles.label}>{"\u80CC\u666F:"}</label>
          <select value={bg} onChange={(e) => setBg(e.target.value)} style={styles.select}>
            {BACKGROUNDS.map((b) => (
              <option key={b} value={b}>{b.split("/").pop()}</option>
            ))}
          </select>
        </div>
        <div style={styles.toolbarGroup}>
          <label style={styles.label}>{"\u9636\u6BB5\u7C7B\u578B:"}</label>
          <select value={phaseType} onChange={(e) => setPhaseType(e.target.value)} style={styles.select}>
            <option value="explore">explore (\u63A2\u7D22)</option>
            <option value="exam">exam (\u8003\u8BD5)</option>
            <option value="transition">transition (\u8FC7\u573A)</option>
            <option value="forced_choice">forced_choice (\u9009\u62E9)</option>
            <option value="poem_compose">poem_compose (\u8BD7\u6B4C\u521B\u4F5C)</option>
            <option value="map_travel">map_travel (\u5730\u56FE\u884C\u65C5)</option>
            <option value="dialogue_branch">dialogue_branch (\u5BF9\u8BDD\u5206\u652F)</option>
            <option value="narration">narration (\u53D9\u4E8B\u6F14\u51FA)</option>
            <option value="escape_game">{"\u{1F6AA} 出城 (escape_game)"}</option>
                <option value="click_points">{"\u{1F441} 找茬 (click_points)"}</option>
                <option value="minigame">minigame (\u5C0F\u6E38\u620F)</option>
          </select>
        </div>
        <div style={styles.toolbarGroup}>
          <label style={styles.label}>{"\u4EBA\u7269\u5927\u5C0F:"}</label>
          <input type="range" min="60" max="420" value={npcSize} onChange={(e) => setNpcSize(Number(e.target.value))} />
          <span style={styles.sizeLabel}>{npcSize}px</span>
        </div>
        <button style={styles.btnSave} onClick={saveToFile}>
          {"\u{1F4BE} \u4FDD\u5B58\u5230\u6587\u4EF6"}
        </button>
        {saveStatus && <span style={styles.saveStatus}>{saveStatus}</span>}
      </div>

      <div style={styles.mainArea}>
        {/* Left: NPC Palette */}
        <div style={styles.palette}>
          <h3 style={styles.paletteTitle}>{"\u4EBA\u7269\u8D44\u6E90"}</h3>
          <div style={styles.paletteGrid}>
            <div style={{ ...styles.paletteItem, border: "1px dashed #888" }} onClick={addTextLabel} title={"文字标签（无立绘）"}>
              <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#F4D03F" }}>{"Aa"}</div>
              <span style={styles.paletteName}>{"文字标签"}</span>
            </div>
            {NPC_PORTRAITS.map((p) => (
              <div key={p.id} style={styles.paletteItem} onClick={() => addNpc(p)} title={p.name}>
                <img src={p.file} alt={p.name} style={styles.paletteImg} />
                <span style={styles.paletteName}>{p.name}</span>
              </div>
            ))}
          </div>

          <h3 style={styles.paletteTitle}>{"\u7269\u54C1 / \u9053\u5177"}</h3>
          <div style={styles.paletteGrid}>
            {PROP_PORTRAITS.map((p) => (
              <div key={p.file} style={styles.paletteItem} onClick={() => addProp(p)} title={p.name}>
                <img src={p.file} alt={p.name} style={styles.paletteImg} />
                <span style={styles.paletteName}>{p.name}</span>
              </div>
            ))}
          </div>

          <h3 style={styles.paletteTitle}>{"\u4EA4\u4E92\u89E6\u53D1\u5668"}</h3>
          <div style={styles.triggerPalette}>
            <div style={styles.triggerItem} onClick={addTriggerZone}>
              <div style={styles.triggerIcon}>{"➡️"}</div>
              <span style={styles.paletteName}>{"\u7EE7\u7EED\u6309\u952E"}</span>
              <span style={styles.triggerDesc}>{"\u663E\u793A\u5728\u573A\u666F\u4E2D\uFF0C\u70B9\u51FB\u8DF3\u8F6C"}</span>
            </div>
            <div style={styles.triggerItem} onClick={addScenePortal}>
              <div style={styles.triggerIcon}>{"🚪"}</div>
              <span style={styles.paletteName}>{"\u573A\u666F\u5165\u53E3"}</span>
              <span style={styles.triggerDesc}>{"\u7ED1\u5B9A\u4F4D\u7F6E\uFF0C\u70B9\u51FB\u8FDB\u5165\u4E0B\u4E00\u573A\u666F"}</span>
            </div>
          </div>

          <h3 style={styles.paletteTitle}>{"\u573A\u666F\u4FE1\u606F"}</h3>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>{"ID"}</label>
            <input style={styles.fieldInput} value={phaseId} onChange={(e) => setPhaseId(e.target.value)} placeholder={"phase_id"} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>{"\u6807\u9898"}</label>
            <input style={styles.fieldInput} value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} placeholder={"\u573A\u666F\u6807\u9898"} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>{"\u53D9\u8FF0"}</label>
            <textarea style={styles.fieldTextarea} value={phaseNarrative} onChange={(e) => setPhaseNarrative(e.target.value)} placeholder={"\u573A\u666F\u63CF\u8FF0"} rows={3} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>{"\u6307\u793A"}</label>
            <input style={styles.fieldInput} value={phaseInstruction} onChange={(e) => setPhaseInstruction(e.target.value)} placeholder={"\u73A9\u5BB6\u6307\u793A"} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>{"\u675C\u752B\u7ACB\u7ED8\uFF08\u672C\u6BB5\u9ED8\u8BA4\uFF09"}</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select style={{ ...styles.fieldInput, flex: 1 }} value={phaseDufuPose}
                onChange={(e) => setPhaseDufuPose(e.target.value)}>
                <option value="">{"\u81EA\u52A8\uFF08\u6309\u4E8B\u4EF6\u5E74\u4EE3" + (sceneData?.year ? " \u00B7 " + sceneData.year : "") + "\uFF09"}</option>
                {DUFU_POSES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
              <img src={dufuPortraitPath(phaseDufuPose, sceneData?.year)} alt=""
                style={{ width: 44, height: 60, objectFit: "cover", objectPosition: "center top", borderRadius: 4, border: "1px solid #555", backgroundColor: "#FFF" }}
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
            </div>
          </div>

        </div>

        {/* Center: Scene canvas */}
        <div style={styles.canvasWrap}>
          <div
            ref={sceneRef}
            style={{ ...styles.canvas, backgroundImage: `url(${bg})` }}
            onClick={() => setSelectedNpc(null)}
          >
            {npcs.map((npc) => (
              <div
                key={npc.id}
                style={{
                  ...styles.npcOnScene,
                  left: npc.x + "%",
                  top: npc.y + "%",
                  width: npcSize,
                  height: npcSize,
                  outline: selectedNpc === npc.id ? "3px solid #F4D03F" : "none",
                  cursor: dragging === npc.id ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => handleMouseDown(e, npc.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedNpc(npc.id); }}
              >
                {npc.portrait ? (
                  <img src={npc.portrait} alt={npc.name} style={{
                    ...styles.npcImg,
                    perspective: npc.perspective ? (npc.perspective + "px") : undefined,
                    transform: [
                      `scale(${npc.scale || 1})`,
                      npc.tiltX ? `rotateX(${npc.tiltX}deg)` : "",
                      npc.tiltY ? `rotateY(${npc.tiltY}deg)` : "",
                      npc.rotate ? `rotate(${npc.rotate}deg)` : "",
                      npc.flip ? "scaleX(-1)" : "",
                    ].filter(Boolean).join(" "),
                  }} />
                ) : (
                  <div style={styles.textLabelOnScene}>
                    <span style={styles.textLabelIcon}>{"Aa"}</span>
                  </div>
                )}
                <div style={styles.npcLabel}>{npc.name}</div>
                <div style={styles.npcCoords}>({npc.x}, {npc.y})</div>
              </div>
            ))}
            {/* Click points on canvas (春望-style 找茬 markers) */}
            {phaseType === "click_points" && clickPoints.map((cp) => {
              const isSel = selectedClickPoint === cp.uid;
              return (
                <div
                  key={cp.uid}
                  style={{
                    position: "absolute",
                    left: cp.x + "%",
                    top: cp.y + "%",
                    transform: "translate(-50%, -50%)",
                    width: cp.size,
                    height: cp.size,
                    borderRadius: "50%",
                    border: isSel ? "4px solid #F4D03F" : "3px dashed rgba(231,76,60,0.85)",
                    boxShadow: isSel ? "0 0 16px rgba(244,208,63,0.7)" : "0 0 8px rgba(231,76,60,0.4)",
                    backgroundColor: "rgba(231,76,60,0.08)",
                    cursor: dragging === cp.uid ? "grabbing" : "grab",
                    zIndex: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FFF", fontSize: 10, fontWeight: "bold",
                    textShadow: "0 1px 2px #000",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedClickPoint(cp.uid);
                    setSelectedNpc(null);
                    setDragging(cp.uid);
                    setDragStartPos({ x: e.clientX, y: e.clientY });
                    setDidDrag(false);
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedClickPoint(cp.uid); setSelectedNpc(null); }}
                  title={cp.label}
                >
                  {cp.label || cp.id}
                </div>
              );
            })}
            {/* Map-travel waypoints on canvas: numbered draggable pins + route line */}
            {phaseType === "map_travel" && destinations.length > 0 && (
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 14 }}
                viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  points={destinations.map((d) => `${d.x},${d.y}`).join(" ")}
                  fill="none" stroke="#E74C3C" strokeWidth="0.5" strokeDasharray="1.5,1" opacity="0.85" />
              </svg>
            )}
            {phaseType === "map_travel" && destinations.map((wp, wi) => (
              <div
                key={wp.uid}
                style={{
                  position: "absolute",
                  left: wp.x + "%",
                  top: wp.y + "%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 19,
                  cursor: dragging === wp.uid ? "grabbing" : "grab",
                  textAlign: "center",
                  outline: selectedNpc === wp.uid ? "3px solid #F4D03F" : "none",
                  borderRadius: 8,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedNpc(wp.uid);
                  setDragging(wp.uid);
                  setDragStartPos({ x: e.clientX, y: e.clientY });
                  setDidDrag(false);
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedNpc(wp.uid); }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  backgroundColor: "#E74C3C", border: "2px solid #FFF",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto",
                }}>
                  <span style={{ transform: "rotate(45deg)", color: "#FFF", fontSize: 12, fontWeight: "bold" }}>{wi + 1}</span>
                </div>
                <div style={{
                  marginTop: 2, fontSize: 11, fontWeight: "bold", color: "#FFF",
                  textShadow: "0 1px 3px #000", whiteSpace: "nowrap",
                }}>{wp.name || wp.id || "?"}</div>
                <div style={{ fontSize: 9, color: "#AAB7C4" }}>({wp.x}, {wp.y})</div>
              </div>
            ))}
            {/* Trigger zones on canvas */}
            {triggerZones.map((tz) => (
              <div
                key={tz.id}
                style={{
                  position: "absolute",
                  left: tz.x + "%",
                  top: tz.y + "%",
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  zIndex: 20,
                  textAlign: "center",
                  outline: selectedNpc === tz.id ? "3px solid #F4D03F" : "none",
                  borderRadius: 8,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedNpc(tz.id);
                  setDragging(tz.id);
                  setDragStartPos({ x: e.clientX, y: e.clientY });
                  setDidDrag(false);
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedNpc(tz.id); }}
              >
                <div style={{
                  backgroundColor: tz.type === "continue" ? "rgba(244,208,63,0.9)" : "rgba(52,152,219,0.9)",
                  color: tz.type === "continue" ? "#1a1a2e" : "#FFF",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}>
                  {tz.type === "continue" ? "➡️ " : "🚪 "}{tz.label}
                </div>
                <div style={{ fontSize: 9, color: "#AAB7C4", marginTop: 2 }}>({tz.x}, {tz.y})</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: detail editor — changes based on phase type */}
        <div style={styles.detailPanel}>
          {/* ---- Phase flow ---- */}
          {sceneData && sceneData.phases && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F4CB} \u9636\u6BB5\u6D41\u7A0B"}</h3>
              <div style={styles.flowChart}>
                {sceneData.phases.map((p, i) => {
                  const isCurrent = i === currentPhaseIndex;
                  return (
                    <div key={p.id + i} style={styles.flowItem}>
                      <div style={{
                        ...styles.flowNode,
                        backgroundColor: isCurrent ? "#F4D03F" : "#2C3E50",
                        color: isCurrent ? "#1a1a2e" : "#AAB7C4",
                        borderColor: isCurrent ? "#F4D03F" : "#555",
                      }} onClick={() => switchPhase(i)}>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>{p.type}</div>
                        <div style={{ fontSize: 11, fontWeight: "bold" }}>{p.title || p.id}</div>
                      </div>
                      {i < sceneData.phases.length - 1 && (
                        <div style={styles.flowArrow}>{p.nextPhase ? "\u2193 " + p.nextPhase : "\u2193"}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u5F53\u524D\u9636\u6BB5\u7684\u4E0B\u4E00\u6B65"}</label>
                <select style={styles.fieldInput} value={nextPhase}
                  onChange={(e) => setNextPhase(e.target.value)}>
                  <option value="">{"-- \u81EA\u52A8\u987A\u5E8F --"}</option>
                  {sceneData.phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.id + " (" + (p.title || "") + ")"}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {/* ---- Trigger zone editor ---- */}
          {(() => {
            const selectedTrigger = triggerZones.find(t => t.id === selectedNpc);
            if (!selectedTrigger) return null;
            const updateTrigger = (field, value) =>
              setTriggerZones(prev => prev.map(t => t.id === selectedTrigger.id ? { ...t, [field]: value } : t));
            return (
              <div style={{ marginBottom: 16 }}>
                <h3 style={styles.editorSectionTitle}>
                  {selectedTrigger.type === "continue" ? "➡️ 触发按键" : "🚪 场景入口"}
                </h3>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>{"显示类型"}</label>
                  <select style={styles.fieldInput} value={selectedTrigger.type}
                    onChange={(e) => updateTrigger("type", e.target.value)}>
                    <option value="continue">{"显性按键（场景中可见）"}</option>
                    <option value="portal">{"区域入口（靠近触发）"}</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>{"标签文字"}</label>
                  <input style={styles.fieldInput} value={selectedTrigger.label}
                    onChange={(e) => updateTrigger("label", e.target.value)} />
                </div>
                <div style={styles.detailCoordText}>{"位置: "}({selectedTrigger.x}, {selectedTrigger.y})</div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>{"触发动作"}</label>
                  <select style={styles.fieldInput} value={selectedTrigger.action || "next_phase"}
                    onChange={(e) => updateTrigger("action", e.target.value)}>
                    <option value="next_phase">{"进入下一阶段（顺序）"}</option>
                    <option value="goto_phase">{"跳转到指定阶段"}</option>
                    <option value="goto_scene">{"跳转到其他场景"}</option>
                    <option value="trigger_dialogue">{"触发对话"}</option>
                  </select>
                </div>
                {(selectedTrigger.action === "goto_phase" || !selectedTrigger.action || selectedTrigger.action === "next_phase") && sceneData && (
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>{"目标阶段"}</label>
                    <select style={styles.fieldInput} value={selectedTrigger.targetPhase || ""}
                      onChange={(e) => updateTrigger("targetPhase", e.target.value)}>
                      <option value="">{"-- 按顺序下一个 --"}</option>
                      {sceneData.phases.map((p) => (
                        <option key={p.id} value={p.id}>{p.id + " (" + (p.title || "") + ")"}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedTrigger.action === "goto_scene" && (
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>{"目标场景文件"}</label>
                    <select style={styles.fieldInput} value={selectedTrigger.targetScene || ""}
                      onChange={(e) => updateTrigger("targetScene", e.target.value)}>
                      <option value="">{"-- 选择场景 --"}</option>
                      {SCENE_FILES.map((s) => (
                        <option key={s.file} value={s.file}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedTrigger.action === "trigger_dialogue" && (
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>{"对话内容"}</label>
                    <textarea style={styles.fieldTextarea} value={selectedTrigger.dialogueText || ""} rows={3}
                      placeholder={"触发的对话文字"}
                      onChange={(e) => updateTrigger("dialogueText", e.target.value)} />
                  </div>
                )}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>{"触发条件"}</label>
                  <select style={styles.fieldInput} value={selectedTrigger.condition || "always"}
                    onChange={(e) => updateTrigger("condition", e.target.value)}>
                    <option value="always">{"始终可用"}</option>
                    <option value="all_talked">{"所有NPC交谈后"}</option>
                    <option value="required_talked">{"达到最少交谈数"}</option>
                  </select>
                </div>
                <button style={styles.btnRemoveNpc}
                  onClick={() => { setTriggerZones(prev => prev.filter(t => t.id !== selectedTrigger.id)); setSelectedNpc(null); }}>
                  {"🗑 删除此触发器"}
                </button>
              </div>
            );
          })()}
          {/* ---- EXPLORE: NPC editor ---- */}
          {phaseType === "explore" && (
            selected && !triggerZones.find(t => t.id === selectedNpc) ? (
              <>
                <div style={styles.detailHeader}>
                  <img src={selected.portrait} alt="" style={styles.detailPortrait} />
                  <div>
                    <input style={styles.detailNameInput} value={selected.name}
                      onChange={(e) => updateNpcField(selected.id, "name", e.target.value)} />
                    <div style={styles.detailCoordText}>{"\u4F4D\u7F6E: "}({selected.x}, {selected.y})</div>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.fieldLabel}>{"\u7ACB\u7ED8"}</label>
                  <select style={styles.fieldInput} value={selected.portrait || ""}
                    onChange={(e) => updateNpcField(selected.id, "portrait", e.target.value)}>
                    <option value="">{"\u65E0\uFF08\u7EAF\u6587\u5B57\u6807\u7B7E\uFF09"}</option>
                    <optgroup label={"\u7269\u54C1 / \u9053\u5177"}>
                      {PROP_PORTRAITS.map((p) => (<option key={p.file} value={p.file}>{p.name}</option>))}
                    </optgroup>
                    <optgroup label={"\u4EBA\u7269"}>
                      {NPC_PORTRAITS.map((p) => (<option key={p.file} value={p.file}>{p.name}</option>))}
                    </optgroup>
                  </select>
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.checkLabel}>
                    <input type="checkbox" checked={selected.isClue}
                      onChange={(e) => updateNpcField(selected.id, "isClue", e.target.checked)} />
                    {" \u662F\u7EBF\u7D22 (isClue)"}
                  </label>
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.fieldLabel}>{"\u7F29\u653E: "}{(selected.scale || 1).toFixed(1)}x</label>
                  <input type="range" min="0.3" max="3" step="0.1" value={selected.scale || 1}
                    onChange={(e) => updateNpcField(selected.id, "scale", parseFloat(e.target.value))}
                    style={{ width: "100%" }} />
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.checkLabel}>
                    <input type="checkbox" checked={selected.flip || false}
                      onChange={(e) => updateNpcField(selected.id, "flip", e.target.checked)} />
                    {" \u6C34\u5E73\u7FFB\u8F6C (flip)"}
                  </label>
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.fieldLabel}>{"\u65CB\u8F6C (rotate): " + (selected.rotate || 0) + "\u00B0"}</label>
                  <input type="range" min="-180" max="180" step="1" value={selected.rotate || 0}
                    onChange={(e) => updateNpcField(selected.id, "rotate", parseInt(e.target.value, 10))}
                    style={{ width: "100%" }} />
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.fieldLabel}>{"X \u8F74\u503E\u659C (tiltX): " + (selected.tiltX || 0) + "\u00B0"}</label>
                  <input type="range" min="-60" max="60" step="1" value={selected.tiltX || 0}
                    onChange={(e) => updateNpcField(selected.id, "tiltX", parseInt(e.target.value, 10))}
                    style={{ width: "100%" }} />
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.fieldLabel}>{"Y \u8F74\u503E\u659C (tiltY): " + (selected.tiltY || 0) + "\u00B0"}</label>
                  <input type="range" min="-60" max="60" step="1" value={selected.tiltY || 0}
                    onChange={(e) => updateNpcField(selected.id, "tiltY", parseInt(e.target.value, 10))}
                    style={{ width: "100%" }} />
                </div>
                <div style={styles.detailRow}>
                  <label style={styles.fieldLabel}>{"3D \u900F\u89C6\u6DF1\u5EA6 (perspective): " + (selected.perspective || 0) + "px"}</label>
                  <input type="range" min="0" max="1500" step="50" value={selected.perspective || 0}
                    onChange={(e) => updateNpcField(selected.id, "perspective", parseInt(e.target.value, 10))}
                    style={{ width: "100%" }} />
                </div>
                <h4 style={styles.dialogueTitle}>{"\u5BF9\u8BDD\u5185\u5BB9"}</h4>
                {selected.dialogues.map((d, i) => (
                  <div key={i} style={styles.dialogueItem}>
                    <div style={styles.dialogueRow}>
                      <input style={styles.dialogueSpeaker} value={d.speakerName || ""}
                        onChange={(e) => updateDialogue(selected.id, i, "speakerName", e.target.value)}
                        placeholder={"\u8BF4\u8BDD\u4EBA"} />
                      <select style={styles.dialogueSpeakerSelect} value={d.speaker || ""}
                        onChange={(e) => updateDialogue(selected.id, i, "speaker", e.target.value)}>
                        <option value="">--speaker--</option>
                        <option value="dufu">{"dufu（杜甫）"}</option>
                        <option value="narrator">{"narrator（旁白）"}</option>
                        {NPC_PORTRAITS.map((p) => (<option key={p.file} value={p.id}>{p.id}</option>))}
                      </select>
                      <button style={styles.btnRemoveDialogue} onClick={() => removeDialogue(selected.id, i)}>{"\u2715"}</button>
                    </div>
                    {(d.speaker === "dufu" || d.speaker === "self") && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <select style={{ ...styles.dialogueSpeakerSelect, flex: 1 }} value={d.dufu_pose || ""}
                          onChange={(e) => updateDialogue(selected.id, i, "dufu_pose", e.target.value)}>
                          <option value="">{"\u675c\u752b\u7acb\u7ed8\uff1a\u8ddf\u968f\u672c\u6bb5"}</option>
                          {DUFU_POSES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                        </select>
                        <img src={dufuPortraitPath(d.dufu_pose || phaseDufuPose, sceneData?.year)} alt=""
                          style={{ width: 28, height: 38, objectFit: "cover", objectPosition: "center top", borderRadius: 3, border: "1px solid #555", backgroundColor: "#FFF" }}
                          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                      </div>
                    )}
                    <textarea style={styles.dialogueText} value={d.text}
                      onChange={(e) => updateDialogue(selected.id, i, "text", e.target.value)}
                      placeholder={"\u5BF9\u8BDD\u5185\u5BB9..."} rows={2} />
                  </div>
                ))}
                <button style={styles.btnAddDialogue} onClick={() => addDialogue(selected.id)}>{"+ \u6DFB\u52A0\u5BF9\u8BDD"}</button>
                <button style={styles.btnRemoveNpc} onClick={() => removeNpc(selected.id)}>{"\u{1F5D1} \u5220\u9664\u6B64\u4EBA\u7269"}</button>
              </>
            ) : (
              <div style={styles.detailEmpty}>
                <p>{"\u2190 \u70B9\u51FB\u5DE6\u4FA7\u4EBA\u7269/\u7269\u54C1\u6DFB\u52A0\u5230\u573A\u666F"}</p>
                <p>{"\u70B9\u51FB\u573A\u666F\u4E2D\u7684\u5143\u7D20\u7F16\u8F91\u8BE6\u60C5"}</p>
                <p>{"\u62D6\u62FD\u8C03\u6574\u4F4D\u7F6E"}</p>
              </div>
            )
          )}

          {/* ---- ESCAPE_GAME: 长安出城 editor ---- */}
          {phaseType === "escape_game" && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F6AA} 出城棋盘地图"}</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>{"列 (gridW)"}</label>
                  <input type="number" min="5" max="30" style={styles.fieldInput}
                    value={egGridW}
                    onChange={(e) => setEgGridW(parseInt(e.target.value, 10) || 13)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>{"行 (gridH)"}</label>
                  <input type="number" min="5" max="30" style={styles.fieldInput}
                    value={egGridH}
                    onChange={(e) => setEgGridH(parseInt(e.target.value, 10) || 14)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>{"节拍 (ms)"}</label>
                  <input type="number" min="50" max="2000" step="50" style={styles.fieldInput}
                    value={egTickMs}
                    onChange={(e) => setEgTickMs(parseInt(e.target.value, 10) || 350)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>{"起点 (x, y)"}</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="number" style={styles.fieldInput}
                      value={egStart.x} onChange={(e) => setEgStart({ ...egStart, x: parseInt(e.target.value, 10) || 0 })} />
                    <input type="number" style={styles.fieldInput}
                      value={egStart.y} onChange={(e) => setEgStart({ ...egStart, y: parseInt(e.target.value, 10) || 0 })} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>{"终点 (x, y)"}</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="number" style={styles.fieldInput}
                      value={egEnd.x} onChange={(e) => setEgEnd({ ...egEnd, x: parseInt(e.target.value, 10) || 0 })} />
                    <input type="number" style={styles.fieldInput}
                      value={egEnd.y} onChange={(e) => setEgEnd({ ...egEnd, y: parseInt(e.target.value, 10) || 0 })} />
                  </div>
                </div>
              </div>

              <h4 style={styles.dialogueTitle}>{"\u753B\u7B14 (\u70B9\u51FB\u68CB\u76D8\u4E0A\u7684\u683C\u5B50)"}</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {[
                  ["toggle_block", "建筑/可走 切换"],
                  ["place_arrow", "放箭头"],
                  ["remove_arrow", "删箭头"],
                  ["place_guard", "放守卫"],
                  ["remove_guard", "删守卫"],
                  ["place_gate", "命名地点"],
                  ["set_start", "设起点"],
                  ["set_end", "设终点"],
                ].map(([k, label]) => (
                  <button key={k}
                    onClick={() => setEgBrush(k)}
                    style={{
                      fontSize: 11, padding: "4px 8px",
                      border: egBrush === k ? "2px solid #F4D03F" : "1px solid #555",
                      backgroundColor: egBrush === k ? "#F4D03F" : "#2C3E50",
                      color: egBrush === k ? "#1a1a2e" : "#AAB7C4",
                      borderRadius: 4, cursor: "pointer",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              {egBrush === "place_arrow" && (
                <div style={{ marginBottom: 8 }}>
                  <label style={styles.fieldLabel}>{"箭头方向"}</label>
                  <select style={styles.fieldInput} value={egArrowDir}
                    onChange={(e) => setEgArrowDir(e.target.value)}>
                    <option value="up">{"\u2191 上"}</option>
                    <option value="down">{"\u2193 下"}</option>
                    <option value="left">{"\u2190 左"}</option>
                    <option value="right">{"\u2192 右"}</option>
                  </select>
                </div>
              )}

              {/* Live grid editor */}
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${egGridW}, 22px)`,
                gridTemplateRows: `repeat(${egGridH}, 22px)`,
                gap: 1, backgroundColor: "#3E2723", padding: 2,
                marginBottom: 8,
              }}>
                {Array.from({ length: egGridW * egGridH }).map((_, i) => {
                  const x = i % egGridW, y = Math.floor(i / egGridW);
                  const k = x + "," + y;
                  const owner = egCells.find((c) => x >= c.x && x < c.x + (c.w || 1) && y >= c.y && y < c.y + (c.h || 1));
                  const isBlocking = !!owner;
                  const arrow = egArrows.find((a) => a.x === x && a.y === y);
                  const guard = egGuards.find((g) => g.x === x && g.y === y);
                  const gate = egGates.find((g) => g.x === x && g.y === y);
                  const isStart = egStart.x === x && egStart.y === y;
                  const isEnd = egEnd.x === x && egEnd.y === y;
                  const isSel = egSelCell && egSelCell.x === x && egSelCell.y === y;
                  let bg = "#F5F5DC";
                  if (isBlocking) bg = owner.fill || "#D4B89A";
                  if (isEnd) bg = "#90EE90";
                  if (isStart) bg = "#FFD580";
                  const arrowGlyph = { up: "\u2191", down: "\u2193", left: "\u2190", right: "\u2192" };
                  const onClickCell = () => {
                    if (egBrush === "toggle_block") {
                      if (owner) {
                        // Click on an existing building => select it (for label edits)
                        if (owner.x === x && owner.y === y) setEgSelCell({ x, y });
                        else setEgCells(egCells.filter((c) => c !== owner)); // click body deletes
                      } else {
                        const nc = { x, y, w: 1, h: 1, label: "新建筑", fill: "#D4B89A" };
                        setEgCells([...egCells, nc]);
                        setEgSelCell({ x, y });
                      }
                    } else if (egBrush === "place_arrow") {
                      setEgArrows([...egArrows.filter((a) => !(a.x === x && a.y === y)), { x, y, dir: egArrowDir }]);
                    } else if (egBrush === "remove_arrow") {
                      setEgArrows(egArrows.filter((a) => !(a.x === x && a.y === y)));
                    } else if (egBrush === "place_guard") {
                      setEgGuards([...egGuards, { x, y, dir: egArrowDir }]);
                    } else if (egBrush === "remove_guard") {
                      setEgGuards(egGuards.filter((g) => !(g.x === x && g.y === y)));
                    } else if (egBrush === "place_gate") {
                      const label = prompt("地点名称（如 金光门）", "新地点");
                      if (label) setEgGates([...egGates.filter((g) => !(g.x === x && g.y === y)), { x, y, label }]);
                    } else if (egBrush === "set_start") {
                      setEgStart({ x, y });
                    } else if (egBrush === "set_end") {
                      setEgEnd({ x, y });
                    }
                  };
                  return (
                    <div key={i} onClick={onClickCell} style={{
                      backgroundColor: bg,
                      border: isSel ? "2px solid #F4D03F" : "1px solid #C0A082",
                      cursor: "pointer",
                      position: "relative",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "#333",
                    }}>
                      {arrow && <span style={{ color: "#3498DB", fontWeight: "bold" }}>{arrowGlyph[arrow.dir]}</span>}
                      {guard && <span style={{ position: "absolute", color: "#1F4E79" }}>{"\u26A0"}</span>}
                      {gate && <span style={{ position: "absolute", top: 0, left: 1, fontSize: 7, color: "#666" }}>{gate.label.slice(0, 2)}</span>}
                      {isStart && <span style={{ position: "absolute", bottom: 0, right: 1, fontSize: 7, color: "#E65100" }}>{"S"}</span>}
                      {isEnd && <span style={{ position: "absolute", bottom: 0, right: 1, fontSize: 7, color: "#1B5E20" }}>{"E"}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Selected building editor */}
              {egSelCell && (() => {
                const cell = egCells.find((c) => c.x === egSelCell.x && c.y === egSelCell.y);
                if (!cell) return null;
                const upd = (field, val) =>
                  setEgCells(egCells.map((c) => c === cell ? { ...c, [field]: val } : c));
                return (
                  <div style={{ ...styles.dialogueItem, borderColor: "#F4D03F", borderWidth: 2, borderStyle: "solid", padding: 8 }}>
                    <div style={{ fontWeight: "bold", marginBottom: 6 }}>{"\u9009\u4E2D\u5EFA\u7B51 ("}{cell.x}{", "}{cell.y}{")"}</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.fieldLabel}>{"宽 (w)"}</label>
                        <input type="number" min="1" max="10" style={styles.fieldInput}
                          value={cell.w || 1} onChange={(e) => upd("w", parseInt(e.target.value, 10) || 1)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.fieldLabel}>{"高 (h)"}</label>
                        <input type="number" min="1" max="10" style={styles.fieldInput}
                          value={cell.h || 1} onChange={(e) => upd("h", parseInt(e.target.value, 10) || 1)} />
                      </div>
                    </div>
                    <label style={styles.fieldLabel}>{"标签 (用 \\n 换行)"}</label>
                    <input style={styles.fieldInput}
                      value={cell.label || ""} onChange={(e) => upd("label", e.target.value)} />
                    <label style={styles.fieldLabel}>{"填充色 (CSS)"}</label>
                    <input style={styles.fieldInput}
                      value={cell.fill || ""} placeholder="#D4B89A"
                      onChange={(e) => upd("fill", e.target.value)} />
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => { setEgCells(egCells.filter((c) => c !== cell)); setEgSelCell(null); }}>
                      {"\u5220\u9664\u6B64\u5EFA\u7B51"}
                    </button>
                  </div>
                );
              })()}

              {/* Guards list */}
              <h4 style={styles.dialogueTitle}>{"\u5B88\u536B ("}{egGuards.length}{")"}</h4>
              {egGuards.map((g, i) => (
                <div key={i} style={{ ...styles.dialogueItem, padding: 6 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#AAB7C4" }}>{"(" + g.x + "," + g.y + ")"}</span>
                    <select style={{ ...styles.fieldInput, flex: 1 }} value={g.dir}
                      onChange={(e) => {
                        const next = [...egGuards]; next[i] = { ...g, dir: e.target.value }; setEgGuards(next);
                      }}>
                      <option value="up">{"\u2191"}</option>
                      <option value="down">{"\u2193"}</option>
                      <option value="left">{"\u2190"}</option>
                      <option value="right">{"\u2192"}</option>
                    </select>
                    <input style={{ ...styles.fieldInput, flex: 2, fontSize: 10 }}
                      placeholder="立绘 URL (留空则用 pool)"
                      value={g.portrait || ""}
                      onChange={(e) => {
                        const next = [...egGuards];
                        next[i] = { ...g, portrait: e.target.value || undefined };
                        setEgGuards(next);
                      }} />
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => setEgGuards(egGuards.filter((_, j) => j !== i))}>{"\u2715"}</button>
                  </div>
                </div>
              ))}

              {/* Soldier portrait pool */}
              <h4 style={styles.dialogueTitle}>{"\u58EB\u5175\u7ACB\u7ED8\u6C60 (\u968F\u673A\u5206\u914D\u7ED9\u5B88\u536B)"}</h4>
              {egSoldierPortraits.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  <input style={{ ...styles.fieldInput, flex: 1, fontSize: 11 }}
                    value={p}
                    onChange={(e) => {
                      const next = [...egSoldierPortraits]; next[i] = e.target.value; setEgSoldierPortraits(next);
                    }} />
                  <button style={styles.btnRemoveDialogue}
                    onClick={() => setEgSoldierPortraits(egSoldierPortraits.filter((_, j) => j !== i))}>{"\u2715"}</button>
                </div>
              ))}
              <button style={styles.btnAddDialogue}
                onClick={() => setEgSoldierPortraits([...egSoldierPortraits, "/assets/characters/npcs/"])}>
                {"+ \u6DFB\u52A0\u7ACB\u7ED8"}
              </button>

              <label style={{ ...styles.fieldLabel, marginTop: 8, display: "block" }}>{"\u73A9\u5BB6\u7ACB\u7ED8 URL\uFF08\u7559\u7A7A = \u81EA\u52A8\u7528\u5BF9\u5E94\u65F6\u671F\u675C\u752B\uFF09"}</label>
              <input style={styles.fieldInput}
                value={egPlayerPortrait}
                placeholder={dufuPortraitPath(phaseDufuPose, sceneData?.year)}
                onChange={(e) => setEgPlayerPortrait(e.target.value)} />
            </div>
          )}

          {/* ---- CLICK_POINTS: 找茬 editor ---- */}
          {phaseType === "click_points" && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F441} 找茬触发点"}</h3>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"图片 URL"}</label>
                <input
                  style={styles.fieldInput}
                  value={clickPointImage}
                  onChange={(e) => setClickPointImage(e.target.value)}
                  placeholder={"/assets/events/.../scene.png"}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"诗句阈值（点击多少次后浮出诗句）"}</label>
                <input
                  type="number" min="1" max="10"
                  style={styles.fieldInput}
                  value={unlockThreshold}
                  onChange={(e) => setUnlockThreshold(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <h4 style={{ ...styles.dialogueTitle, marginTop: 12 }}>
                {"触发点列表 ("}{clickPoints.length}{")"}
              </h4>
              {clickPoints.map((cp) => {
                const isSel = selectedClickPoint === cp.uid;
                const update = (field, value) =>
                  setClickPoints((prev) => prev.map((x) => (x.uid === cp.uid ? { ...x, [field]: value } : x)));
                return (
                  <div
                    key={cp.uid}
                    style={{
                      ...styles.dialogueItem,
                      borderColor: isSel ? "#F4D03F" : "transparent",
                      borderWidth: 2, borderStyle: "solid", borderRadius: 6, padding: 8,
                    }}
                    onClick={() => setSelectedClickPoint(cp.uid)}
                  >
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <input
                        style={{ ...styles.fieldInput, flex: 1, fontSize: 12 }}
                        value={cp.label}
                        onChange={(e) => update("label", e.target.value)}
                        placeholder={"标签"}
                      />
                      <span style={{ fontSize: 10, color: "#AAB7C4" }}>({cp.x}, {cp.y})</span>
                      <button
                        style={styles.btnRemoveDialogue}
                        onClick={(e) => {
                          e.stopPropagation();
                          setClickPoints((prev) => prev.filter((x) => x.uid !== cp.uid));
                          if (isSel) setSelectedClickPoint(null);
                        }}
                      >{"\u2715"}</button>
                    </div>
                    <div style={{ ...styles.detailRow, marginBottom: 6 }}>
                      <label style={styles.fieldLabel}>{"大小: "}{cp.size}{"px"}</label>
                      <input
                        type="range" min="24" max="200" step="2"
                        value={cp.size}
                        onChange={(e) => update("size", parseInt(e.target.value, 10))}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <textarea
                      style={{ ...styles.dialogueText, fontSize: 12 }}
                      value={cp.text}
                      onChange={(e) => update("text", e.target.value)}
                      placeholder={"点击后弹出的诗句独白"}
                      rows={2}
                    />
                  </div>
                );
              })}
              <button
                style={styles.btnAddDialogue}
                onClick={() => {
                  const newId = "pt_" + Date.now();
                  setClickPoints((prev) => [...prev, {
                    uid: newId + "_uid", id: newId, label: "新点",
                    x: 50, y: 50, size: 64, text: "",
                  }]);
                  setSelectedClickPoint(newId + "_uid");
                }}
              >{"+ 添加触发点"}</button>
              <h4 style={{ ...styles.dialogueTitle, marginTop: 12 }}>{"渐进式诗句"}</h4>
              {progressivePoem.map((ln, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <input
                    style={{ ...styles.fieldInput, flex: 1, fontSize: 12 }}
                    value={ln}
                    onChange={(e) => {
                      const next = [...progressivePoem]; next[i] = e.target.value; setProgressivePoem(next);
                    }}
                  />
                  <button
                    style={styles.btnRemoveDialogue}
                    onClick={() => setProgressivePoem((prev) => prev.filter((_, j) => j !== i))}
                  >{"\u2715"}</button>
                </div>
              ))}
              <button
                style={styles.btnAddDialogue}
                onClick={() => setProgressivePoem((prev) => [...prev, ""])}
              >{"+ 添加一句"}</button>
            </div>
          )}

          {/* ---- EXAM: question editor ---- */}
          {phaseType === "exam" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F4DD} \u8003\u8BD5\u8BBE\u7F6E"}</h3>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u8003\u5B98\u7ACB\u7ED8"}</label>
                <select style={styles.fieldInput} value={examinerPortrait}
                  onChange={(e) => setExaminerPortrait(e.target.value)}>
                  <option value="">{"-- \u65E0\u8003\u5B98 --"}</option>
                  {NPC_PORTRAITS.map((p) => (
                    <option key={p.id} value={p.file}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u8003\u5B98\u540D\u79F0"}</label>
                <input style={styles.fieldInput} value={examinerName}
                  onChange={(e) => setExaminerName(e.target.value)} placeholder={"\u5982\uFF1A\u674E\u6797\u752B"} />
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #444", margin: "12px 0" }} />
              <h4 style={{ color: "#F4D03F", margin: "8px 0" }}>{"\u9898\u76EE\u5217\u8868"}</h4>
              {questions.map((q, qi) => (
                <div key={qi} style={styles.questionCard}>
                  <div style={styles.questionHeader}>
                    <span style={styles.questionNum}>{"#" + (qi + 1)}</span>
                    <select style={styles.select} value={q.type || "choice"}
                      onChange={(e) => {
                        const nq = [...questions]; nq[qi] = { ...nq[qi], type: e.target.value };
                        setQuestions(nq);
                      }}>
                      <option value="choice">{"\u9009\u62E9\u9898"}</option>
                      <option value="poem_fill">{"\u586B\u7A7A\u9898"}</option>
                    </select>
                    <button style={styles.btnRemoveDialogue} onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>{"\u2715"}</button>
                  </div>
                  <textarea style={styles.dialogueText} value={q.question || ""} rows={2}
                    placeholder={"\u9898\u76EE\u5185\u5BB9"}
                    onChange={(e) => { const nq = [...questions]; nq[qi] = { ...nq[qi], question: e.target.value }; setQuestions(nq); }} />
                  {q.type === "choice" && (
                    <>
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} style={styles.optionRow}>
                          <span style={{ color: q.answer === oi ? "#2ECC71" : "#888", fontWeight: "bold", cursor: "pointer", minWidth: 20 }}
                            onClick={() => { const nq = [...questions]; nq[qi] = { ...nq[qi], answer: oi }; setQuestions(nq); }}>
                            {q.answer === oi ? "\u2713" : String.fromCharCode(65 + oi)}
                          </span>
                          <input style={styles.fieldInput} value={opt}
                            onChange={(e) => {
                              const nq = [...questions]; const opts = [...(nq[qi].options || [])];
                              opts[oi] = e.target.value; nq[qi] = { ...nq[qi], options: opts }; setQuestions(nq);
                            }} />
                        </div>
                      ))}
                      <button style={styles.btnAddDialogue}
                        onClick={() => { const nq = [...questions]; nq[qi] = { ...nq[qi], options: [...(nq[qi].options || []), ""] }; setQuestions(nq); }}>
                        {"+ \u9009\u9879"}
                      </button>
                    </>
                  )}
                  {q.type === "poem_fill" && (
                    <>
                      <input style={styles.fieldInput} value={q.answer || ""} placeholder={"\u7B54\u6848\uFF08\u6B63\u786E\u8BCD\uFF09"}
                        onChange={(e) => { const nq = [...questions]; nq[qi] = { ...nq[qi], answer: e.target.value }; setQuestions(nq); }} />
                      <label style={{ ...styles.fieldLabel, marginTop: 6, fontSize: 11 }}>{"\u5E72\u6270\u9879\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09"}</label>
                      <textarea style={styles.dialogueText} value={(q.distractors || []).join("\n")} rows={3}
                        placeholder={"\u91D1\n\u94C1\n\u7389"}
                        onChange={(e) => { const nq = [...questions]; nq[qi] = { ...nq[qi], distractors: e.target.value.split("\n").filter(s => s.trim()) }; setQuestions(nq); }} />
                    </>
                  )}
                  <input style={styles.fieldInput} value={q.explanation || ""} placeholder={"\u89E3\u6790\uFF08\u53EF\u9009\uFF09"}
                    onChange={(e) => { const nq = [...questions]; nq[qi] = { ...nq[qi], explanation: e.target.value }; setQuestions(nq); }} />
                </div>
              ))}
              <button style={styles.btnAddPhaseStyle}
                onClick={() => setQuestions([...questions, { type: "choice", question: "", options: ["", "", "", ""], answer: 0, explanation: "" }])}>
                {"+ \u65B0\u589E\u9898\u76EE"}
              </button>
            </div>
          )}

          {/* ---- TRANSITION: transition editor ---- */}
          {phaseType === "transition" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F3AC} \u8FC7\u573A\u8BBE\u7F6E"}</h3>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u8FC7\u573A\u6587\u5B57\uFF08\u5982\u201C\u4E00\u4E2A\u6708\u540E\u2026\u2026\u201D\uFF09"}</label>
                <input style={styles.fieldInput} value={transitionText}
                  onChange={(e) => setTransitionText(e.target.value)} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u516C\u544A/\u699C\u5355\u6587\u5B57"}</label>
                <input style={styles.fieldInput} value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)} placeholder={"\u5982\uFF1A\u672A\u4E0A\u699C"} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u675C\u752B\u53CD\u5E94"}</label>
                <textarea style={styles.fieldTextarea} value={dufuReactionText} rows={4}
                  onChange={(e) => setDufuReactionText(e.target.value)} placeholder={"\u7528\\n\u6362\u884C"} />
              </div>
            </div>
          )}

          {/* ---- FORCED CHOICE: choice editor ---- */}
          {phaseType === "forced_choice" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{2753} \u9009\u62E9\u9898\u8BBE\u7F6E"}</h3>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u95EE\u9898"}</label>
                <textarea style={styles.fieldTextarea} value={choiceQuestion} rows={2}
                  onChange={(e) => setChoiceQuestion(e.target.value)} />
              </div>
              {choiceOptions.map((opt, oi) => (
                <div key={oi} style={styles.questionCard}>
                  <div style={styles.dialogueRow}>
                    <label style={styles.checkLabel}>
                      <input type="checkbox" checked={opt.correct || false}
                        onChange={(e) => {
                          const no = [...choiceOptions]; no[oi] = { ...no[oi], correct: e.target.checked }; setChoiceOptions(no);
                        }} />
                      {" \u6B63\u786E"}
                    </label>
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => setChoiceOptions(choiceOptions.filter((_, i) => i !== oi))}>{"\u2715"}</button>
                  </div>
                  <input style={styles.fieldInput} value={opt.text || ""} placeholder={"\u9009\u9879\u6587\u5B57"}
                    onChange={(e) => { const no = [...choiceOptions]; no[oi] = { ...no[oi], text: e.target.value }; setChoiceOptions(no); }} />
                  <textarea style={styles.dialogueText} value={opt.response?.text || ""} rows={2}
                    placeholder={"\u9009\u62E9\u540E\u7684\u53CD\u9988\u5BF9\u8BDD"}
                    onChange={(e) => {
                      const no = [...choiceOptions];
                      no[oi] = { ...no[oi], response: { ...no[oi].response, speaker: "dufu", speakerName: "\u675C\u752B", text: e.target.value } };
                      setChoiceOptions(no);
                    }} />
                </div>
              ))}
              <button style={styles.btnAddPhaseStyle}
                onClick={() => setChoiceOptions([...choiceOptions, { id: "opt_" + Date.now(), text: "", correct: false, response: { speaker: "dufu", text: "" } }])}>
                {"+ \u65B0\u589E\u9009\u9879"}
              </button>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u7ED3\u8BBA\u53D9\u8FF0"}</label>
                <textarea style={styles.fieldTextarea} value={conclusionNarrative} rows={3}
                  onChange={(e) => setConclusionNarrative(e.target.value)} />
              </div>
            </div>
          )}

          {/* ---- POEM COMPOSE: poetry creation editor ---- */}
          {phaseType === "poem_compose" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F4DC} \u8BD7\u6B4C\u521B\u4F5C"}</h3>
              <p style={styles.phaseDesc}>{"\u7ED9\u73A9\u5BB6\u4E00\u4E2A\u60C5\u5883\uFF0C\u8BA9\u4ED6\u4EEC\u4ECE\u5019\u9009\u8BCD\u53E5\u4E2D\u62FC\u51FA\u8BD7\u53E5\u6216\u6392\u5217\u987A\u5E8F"}</p>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u60C5\u5883\u63CF\u8FF0\uFF08\u5982\u201C\u767B\u9AD8\u671B\u8FDC\u201D\u201C\u9001\u522B\u53CB\u4EBA\u201D\uFF09"}</label>
                <textarea style={styles.fieldTextarea} value={poemContext} rows={2}
                  onChange={(e) => setPoemContext(e.target.value)} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u6B63\u786E\u8BD7\u53E5\uFF08\u5B8C\u6574\u7B54\u6848\uFF09"}</label>
                <textarea style={styles.fieldTextarea} value={poemAnswer} rows={3}
                  onChange={(e) => setPoemAnswer(e.target.value)} placeholder={"\u6BCF\u884C\u4E00\u53E5"} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u5019\u9009\u8BCD\u53E5/\u5E72\u6270\u9879\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09"}</label>
                <textarea style={styles.fieldTextarea} value={poemCandidates.join("\n")} rows={4}
                  onChange={(e) => setPoemCandidates(e.target.value.split("\n"))}
                  placeholder={"\u6B63\u786E\u8BD7\u53E5 + \u5E72\u6270\u9879\uFF0C\u6253\u4E71\u987A\u5E8F\u5C55\u793A\u7ED9\u73A9\u5BB6"} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u89E3\u6790"}</label>
                <textarea style={styles.fieldTextarea} value={poemExplanation} rows={2}
                  onChange={(e) => setPoemExplanation(e.target.value)} />
              </div>
            </div>
          )}

          {/* ---- MAP TRAVEL: route selection editor ---- */}
          {phaseType === "map_travel" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F5FA}\uFE0F \u5730\u56FE\u884C\u65C5"}</h3>
              <p style={styles.phaseDesc}>{"\u73A9\u5BB6\u9009\u62E9\u4E0B\u4E00\u4E2A\u76EE\u7684\u5730\uFF0C\u9014\u4E2D\u53EF\u89E6\u53D1\u4E8B\u4EF6"}</p>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u65C5\u9014\u53D9\u8FF0"}</label>
                <textarea style={styles.fieldTextarea} value={travelNarrative} rows={2}
                  onChange={(e) => setTravelNarrative(e.target.value)} />
              </div>
              <p style={{ ...styles.phaseDesc, color: "#F4D03F" }}>{"\uD83D\uDCA1 \u9014\u7ECF\u70B9\u53EF\u76F4\u63A5\u5728\u5DE6\u4FA7\u5730\u56FE\u4E0A\u62D6\u62FD"}</p>
              {destinations.map((dest, di) => (
                <div key={dest.uid || di} style={{
                  ...styles.questionCard,
                  outline: selectedNpc === dest.uid ? "2px solid #F4D03F" : "none",
                }}>
                  <div style={styles.dialogueRow}>
                    <span style={{ color: "#E74C3C", fontWeight: "bold", minWidth: 22 }}>{di + 1}</span>
                    <input style={styles.fieldInput} value={dest.name || ""} placeholder={"\u5730\u540D\uFF08\u5982\u201C\u6210\u90FD\u201D\uFF09"}
                      onChange={(e) => { const nd = [...destinations]; nd[di] = { ...nd[di], name: e.target.value }; setDestinations(nd); }} />
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => setDestinations(destinations.filter((_, i) => i !== di))}>{"\u2715"}</button>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input style={{ ...styles.fieldInput, flex: 1.4 }} value={dest.id || ""} placeholder={"id\uFF08\u62FC\u97F3\uFF09"}
                      onChange={(e) => { const nd = [...destinations]; nd[di] = { ...nd[di], id: e.target.value }; setDestinations(nd); }} />
                    <input style={{ ...styles.fieldInput, flex: 1 }} type="number" value={dest.x ?? ""} placeholder={"x"}
                      onChange={(e) => { const nd = [...destinations]; nd[di] = { ...nd[di], x: Number(e.target.value) }; setDestinations(nd); }} />
                    <input style={{ ...styles.fieldInput, flex: 1 }} type="number" value={dest.y ?? ""} placeholder={"y"}
                      onChange={(e) => { const nd = [...destinations]; nd[di] = { ...nd[di], y: Number(e.target.value) }; setDestinations(nd); }} />
                  </div>
                  {(dest.dialogues || []).map((dl, dli) => (
                    <div key={dli} style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <select style={{ ...styles.dialogueSpeakerSelect, width: 86 }} value={dl.speaker || "dufu"}
                        onChange={(e) => {
                          const nd = [...destinations]; const dlg = [...nd[di].dialogues];
                          const sp = e.target.value;
                          dlg[dli] = { ...dlg[dli], speaker: sp, speakerName: sp === "dufu" ? "\u675C\u752B" : sp === "narrator" ? "\u65C1\u767D" : (dlg[dli].speakerName || sp) };
                          nd[di] = { ...nd[di], dialogues: dlg }; setDestinations(nd);
                        }}>
                        <option value="dufu">{"\u675C\u752B"}</option>
                        <option value="narrator">{"\u65C1\u767D"}</option>
                      </select>
                      <textarea style={{ ...styles.dialogueText, flex: 1, marginTop: 0 }} value={dl.text || ""} rows={2}
                        placeholder={"\u5230\u8FBE\u540E\u7684\u53F0\u8BCD\u2026"}
                        onChange={(e) => {
                          const nd = [...destinations]; const dlg = [...nd[di].dialogues];
                          dlg[dli] = { ...dlg[dli], text: e.target.value };
                          nd[di] = { ...nd[di], dialogues: dlg }; setDestinations(nd);
                        }} />
                      <button style={styles.btnRemoveDialogue}
                        onClick={() => {
                          const nd = [...destinations];
                          nd[di] = { ...nd[di], dialogues: nd[di].dialogues.filter((_, i) => i !== dli) };
                          setDestinations(nd);
                        }}>{"\u2715"}</button>
                    </div>
                  ))}
                  <button style={styles.btnAddDialogue}
                    onClick={() => {
                      const nd = [...destinations];
                      nd[di] = { ...nd[di], dialogues: [...(nd[di].dialogues || []), { speaker: "dufu", speakerName: "\u675C\u752B", text: "" }] };
                      setDestinations(nd);
                    }}>{"+ \u53F0\u8BCD"}</button>
                </div>
              ))}
              <button style={styles.btnAddPhaseStyle}
                onClick={() => setDestinations([...destinations, {
                  uid: "wp_new_" + Date.now(),
                  id: "", name: "", x: 50, y: 50,
                  dialogues: [{ speaker: "dufu", speakerName: "\u675C\u752B", text: "" }],
                }])}>
                {"+ \u65B0\u589E\u9014\u7ECF\u70B9"}
              </button>
            </div>
          )}

          {/* ---- DIALOGUE BRANCH: branching dialogue tree editor ---- */}
          {phaseType === "dialogue_branch" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F4AC} \u5BF9\u8BDD\u5206\u652F"}</h3>
              <p style={styles.phaseDesc}>{"\u4E0E\u5386\u53F2\u4EBA\u7269\u6DF1\u5EA6\u5BF9\u8BDD\uFF0C\u591A\u8F6E\u9009\u62E9\u5F71\u54CD\u8D70\u5411"}</p>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u5BF9\u8BDD\u5BF9\u8C61\uFF08\u5982\u201C\u674E\u767D\u201D\u201C\u9AD8\u9002\u201D\uFF09"}</label>
                <input style={styles.fieldInput} value={branchCharacter}
                  onChange={(e) => setBranchCharacter(e.target.value)} />
              </div>
              {dialogueTree.map((node, ni) => (
                <div key={ni} style={styles.questionCard}>
                  <div style={styles.dialogueRow}>
                    <span style={{ color: "#F4D03F", fontWeight: "bold", minWidth: 50 }}>{"#" + (ni + 1)}</span>
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => setDialogueTree(dialogueTree.filter((_, i) => i !== ni))}>{"\u2715"}</button>
                  </div>
                  <input style={styles.fieldInput} value={node.speaker || ""} placeholder={"\u8BF4\u8BDD\u4EBA"}
                    onChange={(e) => { const nt = [...dialogueTree]; nt[ni] = { ...nt[ni], speaker: e.target.value }; setDialogueTree(nt); }} />
                  <textarea style={styles.dialogueText} value={node.text || ""} rows={2} placeholder={"\u5BF9\u8BDD\u5185\u5BB9"}
                    onChange={(e) => { const nt = [...dialogueTree]; nt[ni] = { ...nt[ni], text: e.target.value }; setDialogueTree(nt); }} />
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>{"\u73A9\u5BB6\u9009\u9879\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF0C\u683C\u5F0F: \u9009\u9879\u6587\u5B57|\u8DF3\u8F6C\u8282\u70B9\u53F7\uFF09"}</label>
                    <textarea style={styles.dialogueText} value={(node.choices || []).map(c => c.text + "|" + (c.goto || "")).join("\n")} rows={2}
                      onChange={(e) => {
                        const nt = [...dialogueTree];
                        nt[ni] = { ...nt[ni], choices: e.target.value.split("\n").filter(l => l).map(l => {
                          const [text, goto] = l.split("|");
                          return { text: text || "", goto: parseInt(goto) || ni + 2 };
                        })};
                        setDialogueTree(nt);
                      }} />
                  </div>
                </div>
              ))}
              <button style={styles.btnAddPhaseStyle}
                onClick={() => setDialogueTree([...dialogueTree, { speaker: branchCharacter || "", text: "", choices: [] }])}>
                {"+ \u65B0\u589E\u5BF9\u8BDD\u8282\u70B9"}
              </button>
            </div>
          )}

          {/* ---- NARRATION: rich narration with slides ---- */}
          {phaseType === "narration" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F3AC} \u53D9\u4E8B\u6F14\u51FA"}</h3>
              <p style={styles.phaseDesc}>{"\u591A\u6BB5\u6587\u5B57\u914D\u56FE\u7247\u5E8F\u5217\uFF0C\u7C7B\u4F3C\u89C6\u89C9\u5C0F\u8BF4\u7684\u6F14\u51FA\u6A21\u5F0F"}</p>
              {narrationSlides.map((slide, si) => (
                <div key={si} style={styles.questionCard}>
                  <div style={styles.dialogueRow}>
                    <span style={{ color: "#F4D03F", fontWeight: "bold" }}>{"#" + (si + 1)}</span>
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => setNarrationSlides(narrationSlides.filter((_, i) => i !== si))}>{"\u2715"}</button>
                  </div>
                  <textarea style={styles.dialogueText} value={slide.text || ""} rows={3} placeholder={"\u53D9\u8FF0\u6587\u5B57"}
                    onChange={(e) => { const ns = [...narrationSlides]; ns[si] = { ...ns[si], text: e.target.value }; setNarrationSlides(ns); }} />
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>{"\u80CC\u666F\u56FE\u7247"}</label>
                    <select style={{ ...styles.fieldInput, padding: "4px 8px" }} value={slide.image || ""}
                      onChange={(e) => { const ns = [...narrationSlides]; ns[si] = { ...ns[si], image: e.target.value }; setNarrationSlides(ns); }}>
                      <option value="">{"-- \u6C89\u7528\u573A\u666F\u80CC\u666F --"}</option>
                      {BACKGROUNDS.map((b) => <option key={b} value={b}>{b.split("/").pop()}</option>)}
                    </select>
                  </div>
                  <input style={styles.fieldInput} value={slide.speaker || ""} placeholder={"\u8BF4\u8BDD\u4EBA\uFF08\u53EF\u9009\uFF0C\u7A7A=\u65C1\u767D\uFF09"}
                    onChange={(e) => { const ns = [...narrationSlides]; ns[si] = { ...ns[si], speaker: e.target.value }; setNarrationSlides(ns); }} />
                  <input style={styles.fieldInput} value={slide.effect || ""} placeholder={"\u7279\u6548\uFF08\u53EF\u9009: fade/shake/none\uFF09"}
                    onChange={(e) => { const ns = [...narrationSlides]; ns[si] = { ...ns[si], effect: e.target.value }; setNarrationSlides(ns); }} />
                </div>
              ))}
              <button style={styles.btnAddPhaseStyle}
                onClick={() => setNarrationSlides([...narrationSlides, { text: "", image: "", speaker: "", effect: "" }])}>
                {"+ \u65B0\u589E\u6F14\u51FA\u5E27"}
              </button>
            </div>
          )}

          {/* ---- MINIGAME: generic mini-game editor ---- */}
          {phaseType === "minigame" && (
            <div style={styles.examEditor}>
              <h3 style={styles.editorSectionTitle}>{"\u{1F3AE} \u5C0F\u6E38\u620F"}</h3>
              <p style={styles.phaseDesc}>{"\u8BB0\u5FC6\u7FFB\u724C\u3001\u8FDE\u7EBF\u9898\u3001\u62FC\u56FE\u7B49\u8DA3\u5473\u4E92\u52A8"}</p>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u5C0F\u6E38\u620F\u7C7B\u578B"}</label>
                <select style={styles.fieldInput} value={minigameType}
                  onChange={(e) => setMinigameType(e.target.value)}>
                  <option value="memory">{"\u8BB0\u5FC6\u7FFB\u724C\uFF08\u5339\u914D\u8BD7\u53E5\u548C\u4F5C\u8005\uFF09"}</option>
                  <option value="matching">{"\u8FDE\u7EBF\u9898\uFF08\u4E8B\u4EF6\u914D\u5E74\u4EFD\uFF09"}</option>
                  <option value="sorting">{"\u6392\u5E8F\uFF08\u6309\u65F6\u95F4\u6392\u5217\u4E8B\u4EF6\uFF09"}</option>
                  <option value="puzzle">{"\u62FC\u56FE"}</option>
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{"\u6E38\u620F\u8BF4\u660E"}</label>
                <input style={styles.fieldInput} value={minigameInstruction}
                  onChange={(e) => setMinigameInstruction(e.target.value)} placeholder={"\u544A\u8BC9\u73A9\u5BB6\u600E\u4E48\u73A9"} />
              </div>
              {minigameItems.map((item, ii) => (
                <div key={ii} style={styles.questionCard}>
                  <div style={styles.dialogueRow}>
                    <input style={styles.fieldInput} value={item.left || ""} placeholder={"\u5DE6\u4FA7/\u6B63\u9762\uFF08\u5982\u8BD7\u53E5\u3001\u4E8B\u4EF6\uFF09"}
                      onChange={(e) => { const ni = [...minigameItems]; ni[ii] = { ...ni[ii], left: e.target.value }; setMinigameItems(ni); }} />
                    <button style={styles.btnRemoveDialogue}
                      onClick={() => setMinigameItems(minigameItems.filter((_, i) => i !== ii))}>{"\u2715"}</button>
                  </div>
                  <input style={styles.fieldInput} value={item.right || ""} placeholder={"\u53F3\u4FA7/\u80CC\u9762\uFF08\u5982\u4F5C\u8005\u3001\u5E74\u4EFD\uFF09"}
                    onChange={(e) => { const ni = [...minigameItems]; ni[ii] = { ...ni[ii], right: e.target.value }; setMinigameItems(ni); }} />
                </div>
              ))}
              <button style={styles.btnAddPhaseStyle}
                onClick={() => setMinigameItems([...minigameItems, { left: "", right: "" }])}>
                {"+ \u65B0\u589E\u9879\u76EE"}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

const styles = {
  editor: {
    position: "fixed", inset: 0, zIndex: 9999,
    backgroundColor: "#1a1a2e",
    display: "flex", flexDirection: "column",
    fontFamily: "'Noto Serif SC', 'Songti SC', sans-serif",
    color: "#EEE",
  },
  // Toolbar
  toolbar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "8px 16px",
    backgroundColor: "#16213e",
    borderBottom: "1px solid #333",
    flexWrap: "wrap",
  },
  toolbar2: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "6px 16px",
    backgroundColor: "#1a2744",
    borderBottom: "1px solid #333",
    flexWrap: "wrap",
  },
  editingLabel: {
    fontSize: 13, color: "#F4D03F", fontWeight: "bold", marginRight: 16,
  },
  phaseTabs: {
    display: "flex", gap: 4,
  },
  phaseTab: {
    padding: "4px 10px", border: "none", borderRadius: 4,
    cursor: "pointer", fontSize: 11, fontWeight: "bold",
    transition: "all 0.2s",
  },
  btnAddPhase: {
    padding: "6px 12px", backgroundColor: "#27AE60", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: "bold",
  },
  btnDeletePhase: {
    padding: "6px 12px", backgroundColor: "#E74C3C", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12,
  },
  exportTabs: { display: "flex", gap: 4, marginBottom: 12 },
  exportTab: {
    padding: "6px 16px", border: "none", borderRadius: 4,
    cursor: "pointer", fontSize: 13, fontWeight: "bold",
  },
  toolbarTitle: { margin: 0, fontSize: 16, color: "#F4D03F", marginRight: 12 },
  toolbarGroup: { display: "flex", alignItems: "center", gap: 6 },
  label: { fontSize: 12, color: "#AAB7C4" },
  select: {
    padding: "4px 8px", backgroundColor: "#2C3E50", color: "#FFF",
    border: "1px solid #555", borderRadius: 4, fontSize: 12,
  },
  sizeLabel: { fontSize: 12, color: "#F4D03F", minWidth: 40 },
  btnSave: {
    padding: "6px 14px", backgroundColor: "#E67E22", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: "bold",
  },
  saveStatus: { fontSize: 12, color: "#2ECC71", fontWeight: "bold" },
  btnExport: {
    padding: "6px 14px", backgroundColor: "#27AE60", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: "bold",
  },
  // Phase-type editors
  examEditor: { padding: 4 },
  editorSectionTitle: { fontSize: 15, color: "#F4D03F", margin: "0 0 12px", letterSpacing: 2 },
  phaseDesc: { fontSize: 11, color: "#AAB7C4", margin: "0 0 12px", fontStyle: "italic" },
  questionCard: {
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 8, marginBottom: 10,
  },
  questionHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  questionNum: { color: "#F4D03F", fontWeight: "bold", fontSize: 14 },
  optionRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  btnAddPhaseStyle: {
    width: "100%", padding: "8px", backgroundColor: "rgba(46,204,113,0.2)",
    color: "#2ECC71", border: "1px dashed #2ECC71", borderRadius: 4,
    cursor: "pointer", fontSize: 12, marginBottom: 12,
  },
  btnImport: {
    padding: "6px 14px", backgroundColor: "#2980B9", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: "bold",
  },
  btnBack: {
    padding: "6px 14px", backgroundColor: "#555", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, marginLeft: "auto",
  },
  // Main area
  mainArea: {
    flex: 1, display: "flex", overflow: "hidden",
  },
  // Palette
  palette: {
    width: 220, backgroundColor: "#0f3460", padding: 12,
    overflowY: "auto", borderRight: "1px solid #333",
  },
  paletteTitle: { fontSize: 14, color: "#F4D03F", margin: "12px 0 8px", letterSpacing: 2 },
  flowChart: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 0, marginBottom: 12,
  },
  flowItem: {
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  flowNode: {
    padding: "6px 10px", borderRadius: 6, border: "2px solid",
    textAlign: "center", cursor: "pointer", minWidth: 100,
    transition: "all 0.2s",
  },
  flowArrow: {
    color: "#888", fontSize: 14, lineHeight: 1, margin: "2px 0",
  },
  paletteGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6,
  },
  paletteItem: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: 4, cursor: "pointer", borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    transition: "all 0.2s",
  },
  paletteImg: { width: 48, height: 48, objectFit: "contain" },
  paletteName: { fontSize: 10, color: "#CCC", marginTop: 2, textAlign: "center" },
  triggerPalette: {
    display: "flex", flexDirection: "column", gap: 6, marginBottom: 8,
  },
  triggerItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 8px", cursor: "pointer", borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    transition: "all 0.2s",
  },
  triggerIcon: { fontSize: 20, minWidth: 28, textAlign: "center" },
  triggerDesc: { fontSize: 9, color: "#888", display: "block" },
  fieldGroup: { marginBottom: 8 },
  fieldLabel: { fontSize: 11, color: "#AAB7C4", display: "block", marginBottom: 2 },
  fieldInput: {
    width: "100%", padding: "6px 8px", backgroundColor: "#1a1a2e",
    color: "#FFF", border: "1px solid #555", borderRadius: 4, fontSize: 12,
    boxSizing: "border-box",
  },
  fieldTextarea: {
    width: "100%", padding: "6px 8px", backgroundColor: "#1a1a2e",
    color: "#FFF", border: "1px solid #555", borderRadius: 4, fontSize: 12,
    resize: "vertical", boxSizing: "border-box",
  },
  // Canvas
  canvasWrap: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    padding: 12, overflow: "hidden",
  },
  canvas: {
    width: "100%", maxWidth: 960, aspectRatio: "16/9",
    backgroundSize: "cover", backgroundPosition: "center",
    position: "relative", borderRadius: 4,
    border: "2px solid #333",
    backgroundColor: "#2C3E50",
  },
  npcOnScene: {
    position: "absolute", transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    userSelect: "none", zIndex: 10,
  },
  npcImg: { width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" },
  textLabelOnScene: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "2px dashed #D4A574", borderRadius: 8,
    backgroundColor: "rgba(212,165,116,0.15)",
  },
  textLabelIcon: {
    fontSize: 28, color: "#D4A574", fontWeight: "bold",
  },
  npcLabel: {
    fontSize: 11, color: "#FFF", backgroundColor: "rgba(0,0,0,0.7)",
    padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap", marginTop: 2,
  },
  npcCoords: {
    fontSize: 10, color: "#F4D03F", backgroundColor: "rgba(0,0,0,0.7)",
    padding: "1px 4px", borderRadius: 3, marginTop: 1,
  },
  // Detail panel
  detailPanel: {
    width: 280, backgroundColor: "#0f3460", padding: 12,
    overflowY: "auto", borderLeft: "1px solid #333",
  },
  detailHeader: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
    paddingBottom: 12, borderBottom: "1px solid #333",
  },
  detailPortrait: { width: 56, height: 56, objectFit: "contain", flexShrink: 0 },
  detailNameInput: {
    fontSize: 16, fontWeight: "bold", color: "#F4D03F",
    backgroundColor: "transparent", border: "none", borderBottom: "1px solid #555",
    width: "100%", padding: "2px 0",
  },
  detailCoordText: { fontSize: 11, color: "#AAB7C4", marginTop: 4 },
  detailRow: { marginBottom: 8 },
  checkLabel: { fontSize: 12, color: "#CCC", cursor: "pointer" },
  dialogueTitle: { fontSize: 13, color: "#F4D03F", margin: "12px 0 8px", letterSpacing: 2 },
  dialogueItem: {
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 8,
    marginBottom: 8,
  },
  dialogueRow: { display: "flex", gap: 4, marginBottom: 4 },
  dialogueSpeaker: {
    flex: 1, padding: "4px 6px", backgroundColor: "#1a1a2e",
    color: "#FFF", border: "1px solid #555", borderRadius: 3, fontSize: 11,
  },
  dialogueSpeakerSelect: {
    width: 90, padding: "4px", backgroundColor: "#1a1a2e",
    color: "#FFF", border: "1px solid #555", borderRadius: 3, fontSize: 10,
  },
  dialogueText: {
    width: "100%", padding: "6px", backgroundColor: "#1a1a2e",
    color: "#FFF", border: "1px solid #555", borderRadius: 3, fontSize: 12,
    resize: "vertical", boxSizing: "border-box",
  },
  btnRemoveDialogue: {
    padding: "2px 6px", backgroundColor: "#E74C3C", color: "#FFF",
    border: "none", borderRadius: 3, cursor: "pointer", fontSize: 12,
  },
  btnAddDialogue: {
    width: "100%", padding: "6px", backgroundColor: "rgba(46,204,113,0.2)",
    color: "#2ECC71", border: "1px dashed #2ECC71", borderRadius: 4,
    cursor: "pointer", fontSize: 12, marginBottom: 12,
  },
  btnRemoveNpc: {
    width: "100%", padding: "8px", backgroundColor: "#E74C3C",
    color: "#FFF", border: "none", borderRadius: 4,
    cursor: "pointer", fontSize: 12, fontWeight: "bold", marginTop: 12,
  },
  detailEmpty: {
    color: "#888", fontSize: 13, lineHeight: 2, padding: 16, textAlign: "center",
  },
  // Modal
  modal: {
    position: "fixed", inset: 0, zIndex: 10000,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#16213e", borderRadius: 12, padding: 24,
    width: 600, maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column",
  },
  exportArea: {
    flex: 1, minHeight: 300, padding: 12, backgroundColor: "#1a1a2e",
    color: "#2ECC71", border: "1px solid #555", borderRadius: 6, fontSize: 12,
    fontFamily: "monospace", resize: "vertical",
  },
  modalBtns: { display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  btnCopy: {
    padding: "8px 16px", backgroundColor: "#27AE60", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold",
  },
  btnClose: {
    padding: "8px 16px", backgroundColor: "#555", color: "#FFF",
    border: "none", borderRadius: 4, cursor: "pointer",
  },
};
