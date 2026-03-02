import Divider from './Divider'

export default function SectionHeader({ tag, title, className = '' }) {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <span className="font-cinzel text-[0.58rem] tracking-[0.5em] uppercase text-[#8B6010] block mb-3">
        {tag}
      </span>
      <h2 className="font-cinzel-deco text-3xl md:text-4xl text-[#1A1108] font-bold">
        {title}
      </h2>
      <Divider className="justify-center mt-5" />
    </div>
  )
}
