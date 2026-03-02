export default function Button({ children, variant = 'primary', onClick, className = '', type = 'button' }) {
  const base = "font-cinzel text-[0.68rem] tracking-[0.25em] uppercase transition-all duration-300 cursor-pointer"

  const variants = {
    primary: `${base} text-[#0A0804] bg-[#C9A84C] border-none px-10 py-4 hover:bg-[#E8C96A] hover:-translate-y-0.5`,
    secondary: `${base} text-[#1A1108] bg-transparent border border-[#8B6010]/40 px-10 py-4 hover:border-[#C9A84C] hover:text-[#8B6010] hover:-translate-y-0.5`,
    dark: `${base} text-[#F5ECD7] bg-[#1A1108] border-none px-10 py-4 hover:bg-[#8B6010] hover:-translate-y-0.5`,
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${variants[variant]} ${className}`}
      style={{ clipPath: variant === 'primary' || variant === 'dark' ? 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)' : 'none' }}
    >
      {children}
    </button>
  )
}
