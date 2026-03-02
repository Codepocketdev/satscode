export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center border-b border-[#8B6010]/20 bg-[#F5ECD7]/94 backdrop-blur-md">
      <span style={{fontFamily:'Cinzel Decorative,serif', color:'#8B6010', fontSize:'1rem', letterSpacing:'.15em'}}>
        Sats<span style={{color:'#1A1108'}}>Code</span>
      </span>
      <span style={{fontFamily:'Cinzel,serif', fontSize:'.6rem', letterSpacing:'.2em', color:'#8B6010'}}>MENU</span>
    </nav>
  )
}
