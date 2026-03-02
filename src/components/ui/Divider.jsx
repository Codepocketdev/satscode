export default function Divider({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#8B6010]" />
      <div className="w-[6px] h-[6px] bg-[#8B6010] rotate-45 flex-shrink-0" />
      <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#8B6010]" />
    </div>
  )
}
