import re
with open('client/src/pages/Profile.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'bg-[#0F0F0F]': 'bg-white dark:bg-[#0F0F0F]',
    'bg-[#1C1417]': 'bg-orange-50 dark:bg-[#1C1417]',
    'bg-[#7EC8FF22]': 'bg-[#7EC8FF44] dark:bg-[#7EC8FF22]',
    'bg-[#FFB37A12]': 'bg-[#FFB37A33] dark:bg-[#FFB37A12]',
    'text-[#7EC8FF]': 'text-[#005A9E] dark:text-[#7EC8FF]',
    'text-[#9DD7FF]': 'text-[#004A85] dark:text-[#9DD7FF]',
    'text-[#A8B4C4]': 'text-slate-500 dark:text-[#A8B4C4]',
    'text-[#94A4B8]': 'text-slate-600 dark:text-[#94A4B8]',
    'text-[#FFB37A]': 'text-[#B34A00] dark:text-[#FFB37A]',
    'text-[#FFD0CC]': 'text-[#B31A00] dark:text-[#FFD0CC]',
    'text-[#FF9F9A]': 'text-[#D01A1A] dark:text-[#FF9F9A]',
    'text-[#FFD3A9]': 'text-[#9A4200] dark:text-[#FFD3A9]',
    'text-[#D9B999]': 'text-[#7A4B29] dark:text-[#D9B999]',
    'text-[#D8C2B0]': 'text-[#725239] dark:text-[#D8C2B0]',
    'text-[#E9D4C2]': 'text-[#724A29] dark:text-[#E9D4C2]',
    'text-[#EAC8A8]': 'text-[#995511] dark:text-[#EAC8A8]',
    'text-[#CFEBFF]': 'text-[#003B73] dark:text-[#CFEBFF]',
    'text-[#C9BAC8]': 'text-[#5E4E5D] dark:text-[#C9BAC8]',
    'text-[#B8A9B7]': 'text-[#4E3E4D] dark:text-[#B8A9B7]',
    'text-[#B8B8B8]': 'text-[#505050] dark:text-[#B8B8B8]',
    'border-[#FFD6B0]/50': 'border-orange-200 dark:border-[#FFD6B0]/50',
    'border-[#7EC8FF44]': 'border-blue-200 dark:border-[#7EC8FF44]',
    'border-[#FFB37A44]': 'border-orange-200 dark:border-[#FFB37A44]'
}

for old, new in replacements.items():
    text = text.replace(old, new)

# Cleanup any accidental double 'dark:'
text = text.replace('dark:dark:', 'dark:')

with open('client/src/pages/Profile.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
