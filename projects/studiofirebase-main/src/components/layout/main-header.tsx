"use client";

 import Image from "next/image";

 const MainHeader = () => {
 return (
 <div className="relative w-full h-[104vh] text-center flex items-center justify-center bg-background">
 <Image
 src="https://placehold.co/1920x1080.png"
 alt="Hero background"
 width={1920}
 height={1080}
 className="absolute inset-0 w-full h-full object-cover opacity-30"
 data-ai-hint="male model"
 priority
 />
 <div className="relative glass-dark border-2 border-border p-8 rounded-xl shadow-2xl backdrop-blur-xl">
 <h1 className="text-[13.5rem] font-sans font-bold text-foreground">Italo Santos</h1>
 </div>
 </div>
 );
 };

 export default MainHeader;