import re
import sys

file_path = "client/src/pages/Landing.tsx"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Feature header
    old_feature = """          {/* Feature Header */}
          <div className="flex justify-between items-end w-full">
            <div className="flex flex-col gap-2">
              <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[40px] font-bold leading-tight">
                Your trusted partner for<br />
                <span className="text-[#FF5500]">fraud prevention.</span>
              </h2>
            </div>
            <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[16px] leading-[1.6] max-w-[400px] text-right">
              Our system unites and secures a growing<br />
              ecosystem of specialized financial data to eliminate threats.
            </p>
          </div>"""
          
    new_feature = """          {/* Feature Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 w-full">
            <div className="flex flex-col gap-2">
              <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[32px] md:text-[40px] font-bold leading-tight">
                Your trusted partner for<br className="hidden md:block" />
                <span className="text-[#FF5500]">fraud prevention.</span>
              </h2>
            </div>
            <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[15px] md:text-[16px] leading-[1.6] max-w-full md:max-w-[400px] text-left md:text-right">
              Our system unites and secures a growing<br className="hidden md:block" />
              ecosystem of specialized financial data to eliminate threats.
            </p>
          </div>"""
          
    content = content.replace(old_feature, new_feature)

    # 2. How it works timeline
    old_timeline1 = """<div key={idx} className="flex flex-col md:flex-row gap-0 group">"""
    new_timeline1 = """<div key={idx} className="flex flex-row gap-0 group">"""
    content = content.replace(old_timeline1, new_timeline1)
    
    old_timeline2 = """<div className="w-[100px] md:w-[150px] shrink-0 border-r border-[#FF3B3020] relative pt-6 pb-12 pr-8 text-right">"""
    new_timeline2 = """<div className="w-[60px] md:w-[150px] shrink-0 border-r border-[#FF3B3020] relative pt-4 md:pt-6 pb-8 md:pb-12 pr-4 md:pr-8 text-right">"""
    content = content.replace(old_timeline2, new_timeline2)
    
    old_timeline3 = """<div className="pt-6 pb-12 pl-12 flex flex-col gap-3">"""
    new_timeline3 = """<div className="pt-4 md:pt-6 pb-8 md:pb-12 pl-6 md:pl-12 flex flex-col gap-2 md:gap-3">"""
    content = content.replace(old_timeline3, new_timeline3)
    
    old_h3 = """<h3 className="text-[#111827] dark:text-white font-['Sora'] text-2xl font-bold">"""
    new_h3 = """<h3 className="text-[#111827] dark:text-white font-['Sora'] text-xl md:text-2xl font-bold">"""
    content = content.replace(old_h3, new_h3)

    old_p16 = """<p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[16px]">"""
    new_p16 = """<p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[14px] md:text-[16px]">"""
    content = content.replace(old_p16, new_p16)
    
    old_h2_how = """<h2 className="text-[#111827] dark:text-white font-['Sora'] text-[40px] font-bold">"""
    new_h2_how = """<h2 className="text-[#111827] dark:text-white font-['Sora'] text-[28px] md:text-[40px] font-bold">"""
    content = content.replace(old_h2_how, new_h2_how)

    # 3. Fix Timeline dot positioning
    old_dot = """<div className="absolute right-[-6px] top-9 w-3 h-3 rounded-full bg-[#FF5500] shadow-[0_0_10px_#FF5500]" />"""
    new_dot = """<div className="absolute right-[-6px] top-6 md:top-9 w-3 h-3 rounded-full bg-[#FF5500] shadow-[0_0_10px_#FF5500]" />"""
    content = content.replace(old_dot, new_dot)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Updated Landing.tsx layout successfully.")
except Exception as e:
    print(f"Error: {e}")