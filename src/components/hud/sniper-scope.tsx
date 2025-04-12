"use client"

// Import the reticle SVG directly from the same directory
// import reticleSvg from "./reticle.svg"

export default function SniperScope() {
  // Position in the center of the screen
  const positionStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "75mm", //! Must use mm instead of vh, % and px
    height: "75mm", //! Must use mm instead of vh, % and px
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
      <div style={positionStyle}>
        <img
          src={0 || "./reticle.svg"}
          alt="Sniper Scope Reticle"
          width="100%"
          height="100%"
          style={{ display: "block" }}
        />
      </div>
    </div>
  )
}

