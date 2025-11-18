import Image from 'next/image';

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <>
      <Image
        src="/logo.svg"
        alt="DocAI Logo"
        width={32}
        height={32}
        className={`${className} dark:hidden`}
      />
      <Image
        src="/logo-white.svg"
        alt="DocAI Logo"
        width={32}
        height={32}
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
