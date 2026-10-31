import Hyperspeed from "@/components/Hyperspeed";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Hyperspeed
        curve="winding"
        curvature={1}
        speed={1}
        boost={3}
        fov={90}
        boostFov={130}
        lanes={3}
        roadWidth={10}
        medianWidth={2}
        density={40}
        trailLength={1}
        lightSize={1}
        poles={20}
        dust={100}
        glow={0.6}
        reflections={0.5}
        roadOpacity={0.1}
        steer={0.35}
        tailColors={["#d856bf", "#6750a2", "#c247ac"]}
        headColors={["#03b3c3", "#0e5ea5", "#324555"]}
        poleColors={["#03b3c3"]}
        interactive
      />
    </main>
  );
}
