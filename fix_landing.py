path = 'client/src/pages/Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('w-full max-w-[1547px] relative z-10 px-10 flex flex-col gap-10 py-10', 'w-full max-w-[1547px] relative z-10 px-4 md:px-10 flex flex-col gap-10 py-10')
text = text.replace('text-[64px] font-[800] leading-[1.1] tracking-[-2px]', 'text-[46px] sm:text-[64px] font-[800] leading-[1.1] md:tracking-[-2px]')
text = text.replace('text-[18px] leading-[1.6] max-w-3xl', 'text-[15px] sm:text-[18px] leading-[1.6] max-w-3xl px-2')
text = text.replace('milliseconds,<br />', 'milliseconds,<br className=\"hidden md:block\" />')
text = text.replace('flex items-center gap-6 mt-4', 'flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4 w-full sm:w-auto px-4 sm:px-0')
text = text.replace('<Link href=\"/dashboard\">', '<Link href=\"/dashboard\" className=\"w-full sm:w-auto\">')
text = text.replace('bg-[#FF3B30] border border-[#FF5500] text-[#111827] dark:text-white px-8 py-4 rounded-lg font-[\'Inter\'] font-semibold text-[15px] cursor-pointer', 'w-full sm:w-auto bg-[#FF3B30] border border-[#FF5500] text-[#111827] dark:text-white px-8 py-4 rounded-lg font-[\'Inter\'] font-semibold text-[15px] cursor-pointer')
text = text.replace('bg-[#FFFFFF]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-2xl border border-black/20 dark:border-white/20 text-[#111827] dark:text-white px-8 py-4 rounded-lg font-[\'Inter\'] font-semibold text-[15px] cursor-pointer', 'w-full sm:w-auto bg-[#FFFFFF]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-2xl border border-black/20 dark:border-white/20 text-[#111827] dark:text-white px-8 py-4 rounded-lg font-[\'Inter\'] font-semibold text-[15px] cursor-pointer')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated Landing.tsx successfully')
