import Image from "next/image"
import Link from "next/link"

export default function Header() {
  return (
    <div className="border-black/10 border-b h-[40px] flex items-center justify-between px-5 ">
      <Link href="/" className="">
        <Image
        src="/desert-island.webp"
        alt="logo"
        width={30}
        height={30}
        className="rounded-full"
        priority/>

        
      </Link>
      <ul className="flex items-center gap-3">
        <li><Link href="/">Home</Link></li>
        <li><Link href="sourates">Sourates</Link></li>
      </ul>
    </div>
  )
}