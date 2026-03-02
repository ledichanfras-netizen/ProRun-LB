import sys

with open('pages/Periodization.tsx', 'r') as f:
    content = f.read()

search_text = """  const handleSave = () => {
  const handleManualStart = () => {"""

replace_text = """  const handleManualStart = () => {"""

if search_text in content:
    content = content.replace(search_text, replace_text)

    # Also need to find where handleSave was supposed to be or fix the broken block
    broken_block = """    setIsEditing(true);
  };

    if (activeAthlete && fullPlan) {"""

    correct_block = """    setIsEditing(true);
  };

  const handleSave = () => {
    if (activeAthlete && fullPlan) {"""

    content = content.replace(broken_block, correct_block)

    with open('pages/Periodization.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Search text not found")
