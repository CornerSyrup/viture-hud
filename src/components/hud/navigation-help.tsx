export default function NavigationHelp() {
  return (
    <div className="component absolute bottom-8 left-0 right-0 flex justify-center items-center">
      <div className="bg-black/70 px-2 py-0.5 rounded-full text-[10px] text-gray-500 flex items-center gap-2">
        <span>↑ ↓ ← → Navigate</span>
        <span className="h-2 w-px bg-gray-700"></span>
        <span>Enter to Select</span>
      </div>
    </div>
  )
}

