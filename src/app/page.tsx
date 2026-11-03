import Hyperspeed from "@/components/Hyperspeed";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Hyperspeed
        curve="winding"
        curvature={1}
        speed={1.1}
        boost={3.5}
        fov={90}
        boostFov={130}
        lanes={3}
        roadWidth={10}
        medianWidth={2}
        density={42}
        trailLength={1.1}
        lightSize={1}
        poles={22}
        poleHeight={1}
        dust={110}
        glow={0.65}
        reflections={0.5}
        roadOpacity={0.15}
        steer={0.35}
        tailColors={["#d856bf", "#7c3aed", "#c247ac"]}
        headColors={["#38bdf8", "#2563eb", "#0284c7"]}
        poleColors={["#38bdf8"]}
        interactive={true}
      />
    </main>
  );
}
